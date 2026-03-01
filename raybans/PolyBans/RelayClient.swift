import Foundation
import Combine

// MARK: - Observable wrapper (actors can't conform to ObservableObject)

@MainActor
final class RelayConnectionStatus: ObservableObject, @unchecked Sendable {
    @Published var isConnected = false
}

// MARK: - RelayClient

actor RelayClient {
    private let frameURL: URL
    private let transcriptURL: URL
    private let healthURL: URL
    private let ttsWsURL: URL
    private let session: URLSession
    private let encoder = JSONEncoder()
    private let decoder = JSONDecoder()
    let status: RelayConnectionStatus

    private var wsTask: URLSessionWebSocketTask?
    private var isListening = false
    var onTtsReceived: ((String) -> Void)?

    init(host: String, port: Int = 8420, status: RelayConnectionStatus? = nil) async {
        let base = "http://\(host):\(port)"
        self.frameURL = URL(string: "\(base)/ingest/frame")!
        self.transcriptURL = URL(string: "\(base)/ingest/transcript")!
        self.healthURL = URL(string: "\(base)/health")!
        self.ttsWsURL = URL(string: "ws://\(host):\(port)/ws/tts")!
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 5
        self.session = URLSession(configuration: config)
        if let status {
            self.status = status
        } else {
            // Create default status on the main actor to satisfy isolation
            self.status = await MainActor.run { RelayConnectionStatus() }
        }
    }

    /// Test-only initializer that accepts a custom URLSessionConfiguration (e.g., with MockURLProtocol).
    init(host: String, port: Int = 8420, configuration: URLSessionConfiguration, status: RelayConnectionStatus? = nil) async {
        let base = "http://\(host):\(port)"
        self.frameURL = URL(string: "\(base)/ingest/frame")!
        self.transcriptURL = URL(string: "\(base)/ingest/transcript")!
        self.healthURL = URL(string: "\(base)/health")!
        self.ttsWsURL = URL(string: "ws://\(host):\(port)/ws/tts")!
        self.session = URLSession(configuration: configuration)
        if let status {
            self.status = status
        } else {
            // Create default status on the main actor to satisfy isolation
            self.status = await MainActor.run { RelayConnectionStatus() }
        }
    }

    // MARK: - Push Frame (multipart/form-data)

    func pushFrame(_ jpegData: Data) async throws -> FrameResponse {
        let boundary = "Boundary-\(UUID().uuidString)"

        var request = URLRequest(url: frameURL)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        // Pre-size buffer: header ~120 bytes + jpeg + trailer ~50 bytes
        var body = Data(capacity: jpegData.count + 200)
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"frame\"; filename=\"frame.jpg\"\r\n")
        body.append("Content-Type: image/jpeg\r\n\r\n")
        body.append(jpegData)
        body.append("\r\n--\(boundary)--\r\n")
        request.httpBody = body

        let (data, response) = try await session.data(for: request)
        try Self.validateHTTP(response, data: data)
        await setConnected(true)
        return try decoder.decode(FrameResponse.self, from: data)
    }

    // MARK: - Push Transcript (JSON POST)

    func pushTranscript(
        text: String,
        source: String? = nil,
        confidence: Double? = nil,
        language: String? = nil
    ) async throws -> TranscriptResponse {
        var request = URLRequest(url: transcriptURL)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        let body = TranscriptRequest(
            text: text,
            timestamp: nil,
            source: source,
            confidence: confidence,
            language: language
        )
        request.httpBody = try encoder.encode(body)

        let (data, response) = try await session.data(for: request)
        try Self.validateHTTP(response, data: data)
        await setConnected(true)
        return try decoder.decode(TranscriptResponse.self, from: data)
    }

    // MARK: - Health Check

    func health() async throws -> HealthResponse {
        let (data, response) = try await session.data(from: healthURL)
        try Self.validateHTTP(response, data: data)

        await setConnected(true)
        return try decoder.decode(HealthResponse.self, from: data)
    }

    // MARK: - TTS WebSocket Listener

    func setOnTtsReceived(_ handler: @escaping (String) -> Void) {
        self.onTtsReceived = handler
    }

    func startListening() {
        guard !isListening else { return }
        isListening = true
        connectWebSocket()
    }

    func stopListening() {
        isListening = false
        wsTask?.cancel(with: .goingAway, reason: nil)
        wsTask = nil
    }

    private func connectWebSocket() {
        guard isListening else { return }
        let task = session.webSocketTask(with: ttsWsURL)
        self.wsTask = task
        task.resume()
        receiveMessage(task: task)
    }

    private func receiveMessage(task: URLSessionWebSocketTask) {
        task.receive { [weak self] result in
            guard let self else { return }
            Task {
                await self.handleReceive(result: result, task: task)
            }
        }
    }

    private func handleReceive(result: Result<URLSessionWebSocketTask.Message, Error>, task: URLSessionWebSocketTask) {
        switch result {
        case .success(let message):
            print("[RelayClient] WebSocket received message")
            switch message {
            case .string(let text):
                print("[RelayClient] Raw WS text: \(text.prefix(100))")
                if let data = text.data(using: .utf8),
                   let msg = try? decoder.decode(TtsWsMessage.self, from: data) {
                    print("[RelayClient] Decoded TTS: \(msg.text.prefix(50))")
                    onTtsReceived?(msg.text)
                } else {
                    print("[RelayClient] Failed to decode TTS message")
                }
            case .data(let data):
                if let msg = try? decoder.decode(TtsWsMessage.self, from: data) {
                    onTtsReceived?(msg.text)
                }
            @unknown default:
                break
            }
            receiveMessage(task: task)

        case .failure(let error):
            print("[RelayClient] WebSocket error: \(error)")
            // Auto-reconnect after 2 seconds
            guard isListening else { return }
            Task {
                try? await Task.sleep(nanoseconds: 2_000_000_000)
                await self.connectWebSocket()
            }
        }
    }

    // MARK: - Helpers

    private func setConnected(_ value: Bool) async {
        await MainActor.run { status.isConnected = value }
    }

    private static func validateHTTP(_ response: URLResponse, data: Data) throws {
        guard let http = response as? HTTPURLResponse else { throw RelayError.noData }
        guard (200...299).contains(http.statusCode) else {
            let message = String(data: data, encoding: .utf8) ?? "Unknown error"
            throw RelayError.httpError(statusCode: http.statusCode, message: message)
        }
    }
}

// MARK: - Data + string append helper

private extension Data {
    mutating func append(_ string: String) {
        if let d = string.data(using: .utf8) { append(d) }
    }
}
