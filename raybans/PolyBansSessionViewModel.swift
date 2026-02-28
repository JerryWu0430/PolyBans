import Foundation
import UIKit
import Combine

@MainActor
final class PolyBansSessionViewModel: ObservableObject {

    // MARK: - Published State

    @Published var isActive = false
    @Published var relayConnected = false
    @Published var userTranscript = ""
    @Published var latestFrame: UIImage?
    @Published var framesSent = 0
    @Published var transcriptsSent = 0
    @Published var errorMessage: String?

    // MARK: - Owned Components

    private var relay: RelayClient?
    private let speechTranscriber = SpeechTranscriber()
    private let relayStatus = RelayConnectionStatus()
    let glassesManager = GlassesCameraManager()
    private var frameThrottler: FrameThrottler?

    /// Guards against piling up frame-push tasks when relay is slower than capture rate.
    private var framePushInFlight = false

    init() {
        // Forward relay connection status
        relayStatus.$isConnected
            .receive(on: RunLoop.main)
            .assign(to: &$relayConnected)

        // Forward live transcript
        speechTranscriber.$currentTranscript
            .receive(on: RunLoop.main)
            .assign(to: &$userTranscript)
    }

    // MARK: - Session Lifecycle

    func startSession(host: String = "localhost", port: Int = 8420, urlSessionConfiguration: URLSessionConfiguration? = nil) {
        guard !isActive else { return }

        let client: RelayClient
        if let config = urlSessionConfiguration {
            client = RelayClient(host: host, port: port, configuration: config, status: relayStatus)
        } else {
            client = RelayClient(host: host, port: port, status: relayStatus)
        }
        self.relay = client
        isActive = true
        errorMessage = nil

        // 1. Health check
        Task {
            do {
                _ = try await client.health()
            } catch {
                self.errorMessage = "Relay offline: \(error.localizedDescription)"
            }
        }

        // 2. Wire speech transcriber
        speechTranscriber.onTranscript = { [weak self] text, confidence in
            guard let self, let relay = self.relay else { return }
            Task {
                do {
                    _ = try await relay.pushTranscript(
                        text: text,
                        source: "raybans-mic",
                        confidence: confidence,
                        language: "en"
                    )
                    self.transcriptsSent += 1
                } catch {
                    print("[PolyBans] Transcript push failed: \(error)")
                }
            }
        }

        // 3. Start speech
        speechTranscriber.start()

        // 4. Start camera
        startCamera()
    }

    func stopSession() {
        stopCamera()
        speechTranscriber.stop()
        relay = nil
        isActive = false
        relayConnected = false
        framesSent = 0
        transcriptsSent = 0
        userTranscript = ""
        latestFrame = nil
        errorMessage = nil
    }

    // MARK: - Camera Lifecycle

    private func startCamera() {
        let throttler = FrameThrottler(interval: 1.0)
        self.frameThrottler = throttler

        throttler.onThrottledFrame = { [weak self] image in
            Task { @MainActor in
                self?.handleFrame(image)
            }
        }

        glassesManager.onFrameCaptured = { [weak throttler] image in
            throttler?.submit(image)
        }

        glassesManager.start()
    }

    private func stopCamera() {
        glassesManager.stop()
        glassesManager.onFrameCaptured = nil
        frameThrottler?.onThrottledFrame = nil
        frameThrottler = nil
    }

    // MARK: - Camera Integration

    /// Returns a closure safe to call from any thread (e.g., camera capture queue).
    func makeFrameHandler() -> @Sendable (Data) -> Void {
        return { [weak self] jpegData in
            Task { @MainActor in
                self?.handleFrame(jpegData)
            }
        }
    }

    /// Convenience for sources that push `UIImage` instead of raw JPEG data.
    func handleFrame(_ image: UIImage, compressionQuality: CGFloat = 0.7) {
        guard let jpegData = image.jpegData(compressionQuality: compressionQuality) else { return }
        handleFrame(jpegData)
    }

    func handleFrame(_ jpegData: Data) {
        // Throttle preview — only decode when no push is in flight
        if !framePushInFlight {
            latestFrame = UIImage(data: jpegData)
        }

        // Drop frame if a push is already in flight (backpressure)
        guard let relay, !framePushInFlight else { return }

        framePushInFlight = true
        Task {
            defer { self.framePushInFlight = false }
            do {
                _ = try await relay.pushFrame(jpegData)
                self.framesSent += 1
            } catch {
                print("[PolyBans] Frame push failed: \(error)")
            }
        }
    }
}
