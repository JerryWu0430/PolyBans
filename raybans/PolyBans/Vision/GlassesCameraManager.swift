import Foundation
import UIKit
import Combine
import MWDATCamera
import MWDATCore

@MainActor
final class GlassesCameraManager: ObservableObject, CameraSource {

    // MARK: - CameraSource

    nonisolated var onFrameCaptured: ((UIImage) -> Void)?

    // MARK: - Published State

    @Published var isConnected = false
    @Published var registrationState: RegistrationState = .unavailable
    @Published var streamState: StreamState = .idle
    @Published var devices: [WearableDevice] = []
    @Published var hasActiveDevice = false
    @Published var errorMessage: String?

    // MARK: - DAT SDK

    private let wearables = Wearables.shared
    private var deviceSelector: AutoDeviceSelector?
    private var streamSession: StreamSession?
    private var cancellables = Set<AnyCancellable>()
    private var monitorTask: Task<Void, Never>?
    private var registrationTask: Task<Void, Never>?

    // MARK: - Lifecycle

    init() {
        setupDeviceSelector()
    }

    deinit {
        monitorTask?.cancel()
        registrationTask?.cancel()
    }

    // MARK: - CameraSource Conformance

    func start() {
        requestCameraPermission()
        startStreaming()
    }

    func stop() {
        stopStreaming()
    }

    // MARK: - Pairing

    func pair() {
        guard registrationState == .available else { return }
        registrationState = .registering
        registrationTask = Task {
            do {
                try await wearables.startRegistration()
            } catch {
                self.errorMessage = "Pairing failed: \(error.localizedDescription)"
                self.registrationState = .available
            }
        }
    }

    func unpair() {
        guard registrationState == .registered else { return }
        registrationTask = Task {
            do {
                try await wearables.startUnregistration()
                self.registrationState = .available
                self.isConnected = false
                self.hasActiveDevice = false
            } catch {
                self.errorMessage = "Unpairing failed: \(error.localizedDescription)"
            }
        }
    }

    // MARK: - Private Setup

    private func setupDeviceSelector() {
        deviceSelector = AutoDeviceSelector(wearables: wearables)
        monitorRegistrationState()
        monitorDevices()
    }

    private func monitorRegistrationState() {
        monitorTask = Task {
            for await state in wearables.registrationStateStream {
                self.registrationState = state
                if state == .registered {
                    self.isConnected = true
                }
            }
        }
    }

    private func monitorDevices() {
        Task {
            for await deviceList in wearables.devicesStream {
                self.devices = deviceList
                self.hasActiveDevice = !deviceList.isEmpty
            }
        }
    }

    // MARK: - Camera Permission

    private func requestCameraPermission() {
        Task {
            let status = await wearables.checkPermissionStatus(.camera)
            if status != .granted {
                do {
                    try await wearables.requestPermission(.camera)
                } catch {
                    self.errorMessage = "Camera permission denied: \(error.localizedDescription)"
                }
            }
        }
    }

    // MARK: - Streaming

    private func startStreaming() {
        guard streamSession == nil else { return }

        let config = StreamConfiguration(
            codec: .raw,
            resolution: .low,
            frameRate: 24
        )

        do {
            let session = try wearables.createStreamSession(configuration: config)
            self.streamSession = session

            session.statePublisher
                .receive(on: RunLoop.main)
                .sink { [weak self] state in
                    self?.streamState = state
                }
                .store(in: &cancellables)

            session.videoFramePublisher
                .sink { [weak self] frame in
                    guard let self else { return }
                    if let image = frame.toUIImage() {
                        self.onFrameCaptured?(image)
                    }
                }
                .store(in: &cancellables)

            session.start()
        } catch {
            self.errorMessage = "Failed to start stream: \(error.localizedDescription)"
        }
    }

    private func stopStreaming() {
        streamSession?.stop()
        streamSession = nil
        cancellables.removeAll()
        streamState = .idle
    }
}

// MARK: - VideoFrame Extension

private extension VideoFrame {
    func toUIImage() -> UIImage? {
        guard let cgImage = self.cgImage else { return nil }
        return UIImage(cgImage: cgImage)
    }
}
