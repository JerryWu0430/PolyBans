import Combine
import MWDATCamera
import MWDATCore
import UIKit

@MainActor
class GlassesCameraManager: ObservableObject {
    var onFrameCaptured: ((UIImage) -> Void)?

    @Published var isConnected = false
    @Published var registrationState: RegistrationState
    @Published var streamState: StreamSessionState = .stopped
    @Published var devices: [DeviceIdentifier] = []
    @Published var hasActiveDevice = false
    @Published var errorMessage: String?

    private let wearables: WearablesInterface
    private let deviceSelector: AutoDeviceSelector
    private var streamSession: StreamSession

    private var videoFrameToken: AnyListenerToken?
    private var stateToken: AnyListenerToken?
    private var errorToken: AnyListenerToken?

    private var registrationTask: Task<Void, Never>?
    private var devicesTask: Task<Void, Never>?
    private var deviceMonitorTask: Task<Void, Never>?

    private var frameCount = 0
    /// Whether start() has been called (so we auto-start stream when device connects)
    private var wantsStream = false

    init() {
        let wearables = Wearables.shared
        self.wearables = wearables
        self.registrationState = wearables.registrationState
        self.devices = wearables.devices

        let selector = AutoDeviceSelector(wearables: wearables)
        self.deviceSelector = selector

        let config = StreamSessionConfig(
            videoCodec: .raw,
            resolution: .low,
            frameRate: 24
        )
        self.streamSession = StreamSession(streamSessionConfig: config, deviceSelector: selector)

        deviceMonitorTask = Task { [weak self] in
            for await device in selector.activeDeviceStream() {
                guard let self, !Task.isCancelled else { break }
                let connected = device != nil
                self.hasActiveDevice = connected
                self.isConnected = connected
                NSLog("[PolyBans] Active device changed: connected=%d, wantsStream=%d", connected ? 1 : 0, self.wantsStream ? 1 : 0)
                // Auto-start stream when device connects and camera was requested
                if connected && self.wantsStream {
                    NSLog("[PolyBans] Device connected — requesting camera permission and starting stream")
                    await self.requestCameraPermissionAndStart()
                }
            }
        }

        attachListeners()

        registrationTask = Task { [weak self] in
            guard let self else { return }
            for await state in wearables.registrationStateStream() {
                guard !Task.isCancelled else { break }
                NSLog("[PolyBans] Registration state: %@", String(describing: state))
                self.registrationState = state
            }
        }

        devicesTask = Task { [weak self] in
            guard let self else { return }
            for await devices in wearables.devicesStream() {
                guard !Task.isCancelled else { break }
                NSLog("[PolyBans] Devices updated: %d", devices.count)
                self.devices = devices
            }
        }
    }

    // MARK: - CameraSource

    func start() {
        wantsStream = true
        NSLog("[PolyBans] Camera start requested — hasActiveDevice=%d, streamState=%@", hasActiveDevice ? 1 : 0, String(describing: streamState))
        if hasActiveDevice {
            Task {
                await requestCameraPermissionAndStart()
            }
        } else {
            NSLog("[PolyBans] No active device yet — stream will auto-start when device connects")
            Task {
                await streamSession.start()
            }
        }
    }

    func stop() {
        wantsStream = false
        NSLog("[PolyBans] Camera stop requested")
        Task {
            await streamSession.stop()
        }
    }

    // MARK: - Pairing

    func pair() {
        guard registrationState != .registering else { return }
        Task {
            do {
                try await wearables.startRegistration()
            } catch {
                errorMessage = "Registration failed: \(error)"
            }
        }
    }

    func unpair() {
        Task {
            do {
                try await wearables.startUnregistration()
            } catch {
                errorMessage = "Unregistration failed: \(error)"
            }
        }
    }

    // MARK: - Private

    private func requestCameraPermissionAndStart() async {
        NSLog("[PolyBans] Checking camera permission…")
        do {
            let status = try await wearables.checkPermissionStatus(.camera)
            NSLog("[PolyBans] Camera permission status: %@", String(describing: status))
            if status != .granted {
                let result = try await wearables.requestPermission(.camera)
                NSLog("[PolyBans] Camera permission request result: %@", String(describing: result))
                guard result == .granted else {
                    errorMessage = "Camera permission denied"
                    return
                }
            }
        } catch {
            NSLog("[PolyBans] Permission check failed: %@ — starting anyway", "\(error)")
        }

        NSLog("[PolyBans] Starting stream session…")
        await streamSession.start()
        NSLog("[PolyBans] Stream session start returned, state: %@", String(describing: streamState))
    }

    private func attachListeners() {
        frameCount = 0

        videoFrameToken = streamSession.videoFramePublisher.listen { [weak self] videoFrame in
            let image = videoFrame.makeUIImage()
            Task { @MainActor [weak self] in
                guard let self, let image else { return }
                self.frameCount += 1
                if self.frameCount <= 3 || self.frameCount % 100 == 0 {
                    NSLog("[PolyBans] Frame #%d received (%dx%d)", self.frameCount, Int(image.size.width), Int(image.size.height))
                }
                self.onFrameCaptured?(image)
            }
        }

        stateToken = streamSession.statePublisher.listen { [weak self] state in
            Task { @MainActor [weak self] in
                guard let self else { return }
                NSLog("[PolyBans] Stream state changed: %@", String(describing: state))
                self.streamState = state
            }
        }

        errorToken = streamSession.errorPublisher.listen { [weak self] error in
            Task { @MainActor [weak self] in
                guard let self else { return }
                NSLog("[PolyBans] Stream error: %@", String(describing: error))
                self.errorMessage = "Stream error: \(error)"
            }
        }
    }

    deinit {
        registrationTask?.cancel()
        devicesTask?.cancel()
        deviceMonitorTask?.cancel()
    }
}

extension GlassesCameraManager: CameraSource {}
