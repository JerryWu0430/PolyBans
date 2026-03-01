import AVFoundation
import Foundation

@MainActor
final class TTSPlayer: NSObject, AVAudioPlayerDelegate {
    private let apiKey: String
    private let defaultVoiceID: String
    private let modelID: String
    private let outputFormat: String

    private var queue: [String] = []
    private var isSpeaking = false
    private var audioPlayer: AVAudioPlayer?

    private var voiceID: String {
        let stored = UserDefaults.standard.string(forKey: "SelectedVoiceID")
        if let stored, !stored.isEmpty { return stored }
        return defaultVoiceID
    }

    override init() {
        let env = ProcessInfo.processInfo.environment
        let info = Bundle.main.infoDictionary ?? [:]

        func readInfoString(_ key: String) -> String {
            guard let value = info[key] as? String else { return "" }
            return value.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        self.apiKey = {
            let fromInfo = readInfoString("ElevenLabsAPIKey")
            if !fromInfo.isEmpty { return fromInfo }
            return env["ELEVENLABS_API_KEY"] ?? ""
        }()

        self.defaultVoiceID = {
            let fromInfo = readInfoString("ElevenLabsVoiceID")
            if !fromInfo.isEmpty { return fromInfo }
            return env["ELEVENLABS_VOICE_ID"] ?? "TxWZERZ5Hc6h9dGxVmXa"
        }()

        // Higher-quality default model for more realistic playback.
        self.modelID = {
            let fromInfo = readInfoString("ElevenLabsModelID")
            if !fromInfo.isEmpty { return fromInfo }
            return env["ELEVENLABS_MODEL_ID"] ?? "eleven_v3"
        }()

        self.outputFormat = {
            let fromInfo = readInfoString("ElevenLabsOutputFormat")
            if !fromInfo.isEmpty { return fromInfo }
            return env["ELEVENLABS_OUTPUT_FORMAT"] ?? "mp3_44100_128"
        }()

        super.init()
    }

    func speak(_ text: String) {
        print("[TTSPlayer] speak() called: \(text.prefix(50))...")
        queue.append(text)
        playNext()
    }

    func stop() {
        queue.removeAll()
        audioPlayer?.stop()
        audioPlayer = nil
        isSpeaking = false
    }

    // MARK: - Private


    private func playNext() {
        guard !isSpeaking, let text = queue.first else { return }
        queue.removeFirst()
        isSpeaking = true

        guard !apiKey.isEmpty else {
            print("[TTSPlayer] ELEVENLABS_API_KEY is missing.")
            isSpeaking = false
            playNext()
            return
        }

        Task {
            do {
                print("[TTSPlayer] Synthesizing: \(text.prefix(50))...")
                let audioData = try await synthesizeAudio(text: text)
                print("[TTSPlayer] Synthesis complete, \(audioData.count) bytes")
                startPlayback(with: audioData)
            } catch {
                print("[TTSPlayer] ElevenLabs synthesis failed: \(error)")
                isSpeaking = false
                playNext()
            }
        }
    }

    private func synthesizeAudio(text: String) async throws -> Data {
        guard let url = URL(string: "https://api.elevenlabs.io/v1/text-to-speech/\(voiceID)") else {
            throw NSError(domain: "TTSPlayer", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid ElevenLabs URL"])
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue(apiKey, forHTTPHeaderField: "xi-api-key")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("audio/mpeg", forHTTPHeaderField: "Accept")

        let body: [String: Any] = [
            "text": text,
            "model_id": modelID,
            "output_format": outputFormat
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)

        let (data, response) = try await URLSession.shared.data(for: request)
        guard let http = response as? HTTPURLResponse else {
            throw NSError(domain: "TTSPlayer", code: 2, userInfo: [NSLocalizedDescriptionKey: "No HTTP response"])
        }
        guard (200...299).contains(http.statusCode) else {
            let errorMessage = String(data: data, encoding: .utf8) ?? "Unknown ElevenLabs error"
            throw NSError(
                domain: "TTSPlayer",
                code: http.statusCode,
                userInfo: [NSLocalizedDescriptionKey: errorMessage]
            )
        }

        return data
    }

    private func startPlayback(with data: Data) {
        do {
            // SpeechTranscriber already configured .playAndRecord session
            // Just play on existing session - no reconfiguration needed
            let player = try AVAudioPlayer(data: data)
            player.delegate = self
            player.prepareToPlay()
            audioPlayer = player
            print("[TTSPlayer] Starting playback, duration: \(player.duration)s")
            guard player.play() else {
                throw NSError(domain: "TTSPlayer", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to start audio playback"])
            }
        } catch {
            print("[TTSPlayer] Playback failed: \(error)")
            isSpeaking = false
            playNext()
        }
    }

    // MARK: - AVAudioPlayerDelegate

    func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        isSpeaking = false
        playNext()
    }
}
