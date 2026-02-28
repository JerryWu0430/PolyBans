import AVFoundation

final class TTSPlayer: NSObject, AVSpeechSynthesizerDelegate {
    private let synthesizer = AVSpeechSynthesizer()
    private var queue: [String] = []
    private var isSpeaking = false

    override init() {
        super.init()
        synthesizer.delegate = self
    }

    func speak(_ text: String) {
        queue.append(text)
        playNext()
    }

    func stop() {
        queue.removeAll()
        synthesizer.stopSpeaking(at: .immediate)
        isSpeaking = false
    }

    // MARK: - Private

    private func configureAudioSession() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(
                .playAndRecord,
                mode: .voiceChat,
                options: [.allowBluetoothHFP, .allowBluetoothA2DP]
            )
            try session.setActive(true)
            routeToBluetoothIfAvailable(session)
            logCurrentAudioRoute(session)
        } catch {
            print("[TTSPlayer] Audio session setup failed: \(error)")
        }
    }

    private func routeToBluetoothIfAvailable(_ session: AVAudioSession) {
        guard let inputs = session.availableInputs else { return }
        guard let bluetoothInput = inputs.first(where: {
            $0.portType == .bluetoothHFP || $0.portType == .bluetoothLE
        }) else { return }

        do {
            try session.setPreferredInput(bluetoothInput)
        } catch {
            print("[TTSPlayer] Failed to set Bluetooth preferred input: \(error)")
        }
    }

    private func logCurrentAudioRoute(_ session: AVAudioSession) {
        let outputs = session.currentRoute.outputs
            .map { "\($0.portType.rawValue)(\($0.portName))" }
            .joined(separator: ", ")
        print("[TTSPlayer] Current audio outputs: \(outputs)")
    }

    private func playNext() {
        guard !isSpeaking, let text = queue.first else { return }
        queue.removeFirst()
        isSpeaking = true

        configureAudioSession()

        let utterance = AVSpeechUtterance(string: text)
        utterance.voice = AVSpeechSynthesisVoice(language: "en-US")
        utterance.rate = AVSpeechUtteranceDefaultSpeechRate
        synthesizer.speak(utterance)
    }

    // MARK: - AVSpeechSynthesizerDelegate

    func speechSynthesizer(_ synthesizer: AVSpeechSynthesizer, didFinish utterance: AVSpeechUtterance) {
        isSpeaking = false
        playNext()
    }
}
