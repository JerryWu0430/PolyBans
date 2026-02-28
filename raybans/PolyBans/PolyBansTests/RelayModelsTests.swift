import XCTest
@testable import PolyBans // adjust to actual module name

final class RelayModelsTests: XCTestCase {

    // MARK: - FrameResponse

    func testFrameResponseDecodesServerJSON() throws {
        let json = """
        {"id":"a1b2c3d4","timestamp":1700000000000,"sizeBytes":102400}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(FrameResponse.self, from: json)
        XCTAssertEqual(response.id, "a1b2c3d4")
        XCTAssertEqual(response.timestamp, 1700000000000)
        XCTAssertEqual(response.sizeBytes, 102400)
    }

    // MARK: - TranscriptRequest

    func testTranscriptRequestEncodesRequiredFieldsOnly() throws {
        let request = TranscriptRequest(
            text: "hello world",
            timestamp: nil,
            source: nil,
            confidence: nil,
            language: nil
        )
        let data = try JSONEncoder().encode(request)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        XCTAssertEqual(dict["text"] as? String, "hello world")
        // nil optionals should encode as null or be absent — server handles both
        XCTAssert(dict["timestamp"] is NSNull || dict["timestamp"] == nil)
    }

    func testTranscriptRequestEncodesAllFields() throws {
        let request = TranscriptRequest(
            text: "test",
            timestamp: 1700000000000,
            source: "raybans-mic",
            confidence: 0.95,
            language: "en"
        )
        let data = try JSONEncoder().encode(request)
        let dict = try JSONSerialization.jsonObject(with: data) as! [String: Any]

        XCTAssertEqual(dict["text"] as? String, "test")
        XCTAssertEqual(dict["timestamp"] as? Int, 1700000000000)
        XCTAssertEqual(dict["source"] as? String, "raybans-mic")
        XCTAssertEqual(dict["confidence"] as? Double, 0.95)
        XCTAssertEqual(dict["language"] as? String, "en")
    }

    // MARK: - TranscriptResponse

    func testTranscriptResponseDecodesFullServerJSON() throws {
        let json = """
        {"id":"x1y2z3w4","text":"hello","timestamp":1700000000000,"source":"whisper","confidence":0.9,"language":"en"}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(TranscriptResponse.self, from: json)
        XCTAssertEqual(response.id, "x1y2z3w4")
        XCTAssertEqual(response.text, "hello")
        XCTAssertEqual(response.timestamp, 1700000000000)
        XCTAssertEqual(response.source, "whisper")
        XCTAssertEqual(response.confidence, 0.9)
        XCTAssertEqual(response.language, "en")
    }

    func testTranscriptResponseDecodesMinimalServerJSON() throws {
        // Server omits optional fields when not provided
        let json = """
        {"id":"abcd1234","text":"minimal","timestamp":1700000000000}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(TranscriptResponse.self, from: json)
        XCTAssertEqual(response.text, "minimal")
        XCTAssertNil(response.source)
        XCTAssertNil(response.confidence)
        XCTAssertNil(response.language)
    }

    // MARK: - HealthResponse

    func testHealthResponseDecodesServerJSON() throws {
        let json = """
        {"status":"ok","uptimeS":123.456,"framesIngested":10,"transcriptsIngested":5,"frameSubscribers":2,"transcriptSubscribers":1,"ttsSubscribers":3,"ttsIngested":7}
        """.data(using: .utf8)!

        let response = try JSONDecoder().decode(HealthResponse.self, from: json)
        XCTAssertEqual(response.status, "ok")
        XCTAssertEqual(response.uptimeS, 123.456, accuracy: 0.001)
        XCTAssertEqual(response.framesIngested, 10)
        XCTAssertEqual(response.transcriptsIngested, 5)
        XCTAssertEqual(response.frameSubscribers, 2)
        XCTAssertEqual(response.transcriptSubscribers, 1)
        XCTAssertEqual(response.ttsSubscribers, 3)
        XCTAssertEqual(response.ttsIngested, 7)
    }

    // MARK: - TtsWsMessage

    func testTtsWsMessageDecodesServerJSON() throws {
        let json = """
        {"type":"tts","id":"abc12345","text":"Hello from PolyBans","timestamp":1700000000000}
        """.data(using: .utf8)!

        let msg = try JSONDecoder().decode(TtsWsMessage.self, from: json)
        XCTAssertEqual(msg.type, "tts")
        XCTAssertEqual(msg.id, "abc12345")
        XCTAssertEqual(msg.text, "Hello from PolyBans")
        XCTAssertEqual(msg.timestamp, 1700000000000)
    }

    func testTtsWsMessageRoundTrips() throws {
        let original = TtsWsMessage(type: "tts", id: "round123", text: "round trip", timestamp: 1700000000000)
        let data = try JSONEncoder().encode(original)
        let decoded = try JSONDecoder().decode(TtsWsMessage.self, from: data)
        XCTAssertEqual(decoded.type, original.type)
        XCTAssertEqual(decoded.id, original.id)
        XCTAssertEqual(decoded.text, original.text)
        XCTAssertEqual(decoded.timestamp, original.timestamp)
    }

    // MARK: - RelayError

    func testRelayErrorDescriptions() {
        XCTAssertNotNil(RelayError.invalidURL.errorDescription)
        XCTAssertNotNil(RelayError.noData.errorDescription)
        XCTAssertNotNil(RelayError.encodingFailed.errorDescription)

        let httpError = RelayError.httpError(statusCode: 400, message: "Bad Request")
        XCTAssertTrue(httpError.errorDescription!.contains("400"))
        XCTAssertTrue(httpError.errorDescription!.contains("Bad Request"))
    }
}
