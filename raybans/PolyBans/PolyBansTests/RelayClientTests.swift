import XCTest
@testable import PolyBans // adjust to actual module name

@MainActor
final class RelayClientTests: XCTestCase {

    private var client: RelayClient!
    private var status: RelayConnectionStatus!

    override func setUp() async throws {
        try await super.setUp()
        status = RelayConnectionStatus()
        client = await RelayClient(
            host: "localhost",
            port: 8420,
            configuration: MockURLProtocol.testConfiguration,
            status: status
        )
    }

    override func tearDown() async throws {
        MockURLProtocol.handler = nil
        try await super.tearDown()
    }

    // MARK: - Health

    func testHealthSuccess() async throws {
        MockURLProtocol.handler = { request in
            XCTAssertEqual(request.url?.path, "/health")
            XCTAssertEqual(request.httpMethod, "GET")

            let json = """
            {"status":"ok","uptimeS":42.0,"framesIngested":3,"transcriptsIngested":1,"frameSubscribers":0,"transcriptSubscribers":0,"ttsSubscribers":0,"ttsIngested":0}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        let health = try await client.health()
        XCTAssertEqual(health.status, "ok")
        XCTAssertEqual(health.framesIngested, 3)
        XCTAssertTrue(status.isConnected)
    }

    func testHealthSetsConnectedTrue() async throws {
        XCTAssertFalse(status.isConnected)

        MockURLProtocol.handler = { request in
            let json = """
            {"status":"ok","uptimeS":0,"framesIngested":0,"transcriptsIngested":0,"frameSubscribers":0,"transcriptSubscribers":0,"ttsSubscribers":0,"ttsIngested":0}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        _ = try await client.health()
        XCTAssertTrue(status.isConnected)
    }

    func testHealthThrowsOnServerError() async {
        MockURLProtocol.handler = { request in
            let body = "{\"error\":\"down\"}".data(using: .utf8)!
            return (body, MockURLProtocol.response(url: request.url!, statusCode: 500))
        }

        do {
            _ = try await client.health()
            XCTFail("Expected error")
        } catch let error as RelayError {
            if case .httpError(let code, _) = error {
                XCTAssertEqual(code, 500)
            } else {
                XCTFail("Wrong error case: \(error)")
            }
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    // MARK: - Push Frame

    func testPushFrameSendsMultipartWithCorrectFieldName() async throws {
        let fakeJpeg = Data([0xFF, 0xD8, 0xFF, 0xE0]) // JPEG magic bytes

        MockURLProtocol.handler = { request in
            XCTAssertEqual(request.url?.path, "/ingest/frame")
            XCTAssertEqual(request.httpMethod, "POST")

            let contentType = request.value(forHTTPHeaderField: "Content-Type") ?? ""
            XCTAssertTrue(contentType.starts(with: "multipart/form-data; boundary="))

            // Verify body contains the correct field name and filename
            let body = request.httpBody ?? Data()
            let bodyString = String(data: body, encoding: .isoLatin1) ?? ""
            XCTAssertTrue(bodyString.contains("name=\"frame\""), "Multipart field name must be 'frame'")
            XCTAssertTrue(bodyString.contains("filename=\"frame.jpg\""))
            XCTAssertTrue(bodyString.contains("Content-Type: image/jpeg"))

            let json = """
            {"id":"abc12345","timestamp":1700000000000,"sizeBytes":\(fakeJpeg.count)}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        let response = try await client.pushFrame(fakeJpeg)
        XCTAssertEqual(response.id, "abc12345")
        XCTAssertEqual(response.sizeBytes, fakeJpeg.count)
    }

    func testPushFrameContainsJPEGPayload() async throws {
        let payload = Data(repeating: 0xAB, count: 256)

        MockURLProtocol.handler = { request in
            let body = request.httpBody ?? Data()
            // The raw JPEG bytes must appear in the multipart body
            XCTAssertTrue(body.range(of: payload) != nil, "JPEG payload missing from multipart body")

            let json = """
            {"id":"f1234567","timestamp":1700000000000,"sizeBytes":256}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        _ = try await client.pushFrame(payload)
    }

    func testPushFrameThrowsOn400() async {
        MockURLProtocol.handler = { request in
            let body = "{\"error\":\"No file uploaded\"}".data(using: .utf8)!
            return (body, MockURLProtocol.response(url: request.url!, statusCode: 400))
        }

        do {
            _ = try await client.pushFrame(Data([0x00]))
            XCTFail("Expected error")
        } catch let error as RelayError {
            if case .httpError(let code, _) = error {
                XCTAssertEqual(code, 400)
            } else {
                XCTFail("Wrong error case")
            }
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }

    // MARK: - Push Transcript

    func testPushTranscriptSendsJSON() async throws {
        MockURLProtocol.handler = { request in
            XCTAssertEqual(request.url?.path, "/ingest/transcript")
            XCTAssertEqual(request.httpMethod, "POST")
            XCTAssertEqual(request.value(forHTTPHeaderField: "Content-Type"), "application/json")

            // Verify the JSON body
            let body = request.httpBody ?? Data()
            let dict = try! JSONSerialization.jsonObject(with: body) as! [String: Any]
            XCTAssertEqual(dict["text"] as? String, "hello world")
            XCTAssertEqual(dict["source"] as? String, "raybans-mic")
            XCTAssertEqual(dict["confidence"] as? Double, 0.85)
            XCTAssertEqual(dict["language"] as? String, "en")

            let json = """
            {"id":"t1234567","text":"hello world","timestamp":1700000000000,"source":"raybans-mic","confidence":0.85,"language":"en"}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        let response = try await client.pushTranscript(
            text: "hello world",
            source: "raybans-mic",
            confidence: 0.85,
            language: "en"
        )
        XCTAssertEqual(response.id, "t1234567")
        XCTAssertEqual(response.text, "hello world")
        XCTAssertEqual(response.source, "raybans-mic")
    }

    func testPushTranscriptMinimalFields() async throws {
        MockURLProtocol.handler = { request in
            let body = request.httpBody ?? Data()
            let dict = try! JSONSerialization.jsonObject(with: body) as! [String: Any]
            XCTAssertEqual(dict["text"] as? String, "just text")
            // Optional fields are omitted by default JSONEncoder
            XCTAssertNil(dict["source"])

            let json = """
            {"id":"m1234567","text":"just text","timestamp":1700000000000}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        let response = try await client.pushTranscript(text: "just text")
        XCTAssertEqual(response.text, "just text")
        XCTAssertNil(response.source)
    }

    func testPushTranscriptSetsConnected() async throws {
        XCTAssertFalse(status.isConnected)

        MockURLProtocol.handler = { request in
            let json = """
            {"id":"c1234567","text":"hi","timestamp":1700000000000}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        _ = try await client.pushTranscript(text: "hi")
        XCTAssertTrue(status.isConnected)
    }
}
