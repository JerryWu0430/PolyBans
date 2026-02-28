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
            }
        }

        attachListeners()

        registrationTask = Task { [weak self] in
            guard let self else { return }
            for await state in wearables.registrationStateStream() {
                guard !Task.isCancelled else { break }
                self.registrationState = state
            }
        }

        devicesTask = Task { [weak self] in
            guard let self else { return }
            for await devices in wearables.devicesStream() {
                guard !Task.isCancelled else { break }
                self.devices = devices
            }
        }
    }

    // MARK: - CameraSource

    func start() {
        if hasActiveDevice {
            Task {
                await requestCameraPermissionAndStart()
            }
        } else {
            Task {
                await streamSession.start()
            }
        }
    }

    func stop() {
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
        do {
            let status = try await wearables.checkPermissionStatus(.camera)
            if status != .granted {
                let result = try await wearables.requestPermission(.camera)
                guard result == .granted else {
                    errorMessage = "Camera permission denied"
                    return
                }
            }
        } catch {
            NSLog("[PolyBans] Permission check failed: %@ — starting anyway", "\(error)")
        }

        await streamSession.start()
    }

    private func attachListeners() {
        frameCount = 0

        videoFrameToken = streamSession.videoFramePublisher.listen { [weak self] videoFrame in
            let image = videoFrame.makeUIImage()
            Task { @MainActor [weak self] in
                guard let self, let image else { return }
                self.frameCount += 1
                self.onFrameCaptured?(image)
            }
        }

        stateToken = streamSession.statePublisher.listen { [weak self] state in
            Task { @MainActor [weak self] in
                guard let self else { return }
                self.streamState = state
            }
        }

        errorToken = streamSession.errorPublisher.listen { [weak self] error in
            Task { @MainActor [weak self] in
                guard let self else { return }
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
