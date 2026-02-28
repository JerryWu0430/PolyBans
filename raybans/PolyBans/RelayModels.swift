import Foundation

// MARK: - Frame

struct FrameResponse: Codable {
    let id: String
    let timestamp: Int
    let sizeBytes: Int
}

// MARK: - Transcript

struct TranscriptRequest: Codable {
    let text: String
    let timestamp: Int?
    let source: String?
    let confidence: Double?
    let language: String?
}

struct TranscriptResponse: Codable {
    let id: String
    let text: String
    let timestamp: Int
    let source: String?
    let confidence: Double?
    let language: String?
}

// MARK: - Health

struct HealthResponse: Codable {
    let status: String
    let uptimeS: Double
    let framesIngested: Int
    let transcriptsIngested: Int
    let frameSubscribers: Int
    let transcriptSubscribers: Int
    let ttsSubscribers: Int
    let ttsIngested: Int
}

// MARK: - TTS

struct TtsWsMessage: Codable {
    let type: String
    let id: String
    let text: String
    let timestamp: Int
}

// MARK: - Errors

enum RelayError: LocalizedError {
    case invalidURL
    case noData
    case httpError(statusCode: Int, message: String)
    case encodingFailed

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid relay server URL"
        case .noData:
            return "No data in response"
        case .httpError(let code, let message):
            return "HTTP \(code): \(message)"
        case .encodingFailed:
            return "Failed to encode request"
        }
    }
}
