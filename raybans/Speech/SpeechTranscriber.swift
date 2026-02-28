import Foundation
import Speech
import AVFoundation

@MainActor
final class SpeechTranscriber: ObservableObject {

    @Published var currentTranscript: String = ""
    @Published var isTranscribing: Bool = false

    /// Fires (finalText, confidence) when a final result is received.
    var onTranscript: ((String, Double) -> Void)?

    private let speechRecognizer = SFSpeechRecognizer(locale: Locale(identifier: "en-US"))
    private let audioEngine = AVAudioEngine()
    private var recognitionRequest: SFSpeechAudioBufferRecognitionRequest?
    private var recognitionTask: SFSpeechRecognitionTask?
    private var shouldRestart = false
    private var isAuthorized = false

    // MARK: - Public API

    func start() {
        guard !isTranscribing else { return }
        shouldRestart = true
        requestPermissionsAndBegin()
    }

    func stop() {
        shouldRestart = false
        stopRecognition()
    }

    // MARK: - Permissions

    private func requestPermissionsAndBegin() {
        if isAuthorized {
            configureAudioSessionAndStart()
            return
        }

        // Mic permission first — must be granted before speech will work
        AVAudioApplication.requestRecordPermission { [weak self] micGranted in
            Task { @MainActor in
                guard let self else { return }
                guard micGranted else {
                    print("[SpeechTranscriber] Microphone permission denied")
                    return
                }

                SFSpeechRecognizer.requestAuthorization { [weak self] authStatus in
                    Task { @MainActor in
                        guard let self else { return }
                        switch authStatus {
                        case .authorized:
                            self.isAuthorized = true
                            self.configureAudioSessionAndStart()
                        default:
                            print("[SpeechTranscriber] Speech authorization denied: \(authStatus.rawValue)")
                        }
                    }
                }
            }
        }
    }

    // MARK: - Audio Session + Recognition

    private func configureAudioSessionAndStart() {
        let audioSession = AVAudioSession.sharedInstance()
        do {
            try audioSession.setCategory(.playAndRecord, options: [.allowBluetooth, .defaultToSpeaker])
            try audioSession.setActive(true, options: .notifyOthersOnDeactivation)
        } catch {
            print("[SpeechTranscriber] Audio session error: \(error)")
            return
        }
        startRecognition()
    }

    private func startRecognition() {
        guard let speechRecognizer, speechRecognizer.isAvailable else {
            print("[SpeechTranscriber] Speech recognizer unavailable")
            return
        }

        recognitionRequest = SFSpeechAudioBufferRecognitionRequest()
        guard let recognitionRequest else { return }

        recognitionRequest.shouldReportPartialResults = true

        let inputNode = audioEngine.inputNode
        let recordingFormat = inputNode.outputFormat(forBus: 0)

        inputNode.installTap(onBus: 0, bufferSize: 1024, format: recordingFormat) { [weak self] buffer, _ in
            self?.recognitionRequest?.append(buffer)
        }

        recognitionTask = speechRecognizer.recognitionTask(with: recognitionRequest) { [weak self] result, error in
            Task { @MainActor in
                guard let self else { return }

                if let result {
                    self.currentTranscript = result.bestTranscription.formattedString

                    if result.isFinal {
                        let text = result.bestTranscription.formattedString
                        let segments = result.bestTranscription.segments
                        let confidence: Double
                        if segments.isEmpty {
                            confidence = 0
                        } else {
                            confidence = Double(segments.reduce(Float(0)) { $0 + $1.confidence }) / Double(segments.count)
                        }
                        self.onTranscript?(text, confidence)
                        self.currentTranscript = ""
                    }
                }

                if error != nil || (result?.isFinal == true) {
                    self.stopRecognition()
                    // Auto-restart to handle Apple's ~1 min recognition limit.
                    // Delay avoids a tight spin loop if startRecognition fails immediately
                    // (e.g., Bluetooth drops mid-demo).
                    if self.shouldRestart {
                        try? await Task.sleep(for: .milliseconds(300))
                        guard self.shouldRestart else { return }
                        self.startRecognition()
                    }
                }
            }
        }

        do {
            audioEngine.prepare()
            try audioEngine.start()
            isTranscribing = true
        } catch {
            print("[SpeechTranscriber] Audio engine start error: \(error)")
            stopRecognition()
        }
    }

    private func stopRecognition() {
        audioEngine.stop()
        audioEngine.inputNode.removeTap(onBus: 0)
        recognitionRequest?.endAudio()
        recognitionRequest = nil
        recognitionTask?.cancel()
        recognitionTask = nil
        isTranscribing = false
    }
}
