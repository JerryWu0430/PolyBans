import XCTest
@testable import PolyBans // adjust to actual module name

@MainActor
final class PolyBansSessionViewModelTests: XCTestCase {

    override func tearDown() {
        MockURLProtocol.handler = nil
        super.tearDown()
    }

    // MARK: - Initial State

    func testInitialState() {
        let vm = PolyBansSessionViewModel()
        XCTAssertFalse(vm.isActive)
        XCTAssertFalse(vm.relayConnected)
        XCTAssertEqual(vm.userTranscript, "")
        XCTAssertNil(vm.latestFrame)
        XCTAssertEqual(vm.framesSent, 0)
        XCTAssertEqual(vm.transcriptsSent, 0)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Session Lifecycle

    func testStartSessionSetsIsActive() {
        stubHealthOK()
        let vm = PolyBansSessionViewModel()
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)
        XCTAssertTrue(vm.isActive)
    }

    func testStartSessionTwiceIsNoOp() {
        stubHealthOK()
        let vm = PolyBansSessionViewModel()
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)
        XCTAssertTrue(vm.isActive)
    }

    func testStopSessionResetsAllState() {
        stubHealthOK()
        let vm = PolyBansSessionViewModel()
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)
        vm.stopSession()

        XCTAssertFalse(vm.isActive)
        XCTAssertFalse(vm.relayConnected)
        XCTAssertEqual(vm.framesSent, 0)
        XCTAssertEqual(vm.transcriptsSent, 0)
        XCTAssertEqual(vm.userTranscript, "")
        XCTAssertNil(vm.latestFrame)
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Frame Handling

    func testHandleFrameUpdatesLatestFrame() {
        let vm = PolyBansSessionViewModel()
        let jpegData = createMinimalJPEG()

        vm.handleFrame(jpegData)
        XCTAssertNotNil(vm.latestFrame)
    }

    func testHandleFrameDropsWhenNoRelay() {
        let vm = PolyBansSessionViewModel()
        let jpegData = createMinimalJPEG()

        vm.handleFrame(jpegData)
        XCTAssertEqual(vm.framesSent, 0)
    }

    func testFramePushIncrementsCounter() async throws {
        stubAllEndpoints()
        let vm = PolyBansSessionViewModel()
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)

        let jpeg = createMinimalJPEG()
        vm.handleFrame(jpeg)

        // Wait for the fire-and-forget Task to complete
        try await Task.sleep(for: .milliseconds(200))
        XCTAssertEqual(vm.framesSent, 1)
    }

    func testBackpressureDropsFramesWhileInFlight() async throws {
        let requestCount = LockedCounter()

        MockURLProtocol.handler = { request in
            if request.url?.path == "/health" {
                return (self.healthJSON, MockURLProtocol.response(url: request.url!))
            }
            requestCount.increment()
            let json = """
            {"id":"f1","timestamp":1700000000000,"sizeBytes":100}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }

        let vm = PolyBansSessionViewModel()
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)

        let jpeg = createMinimalJPEG()
        for _ in 0..<10 {
            vm.handleFrame(jpeg)
        }

        try await Task.sleep(for: .milliseconds(300))

        // Backpressure: first frame goes through, rest dropped while in-flight.
        // After the first completes, one more might sneak in.
        XCTAssertLessThanOrEqual(requestCount.value, 3, "Backpressure should drop excess frames")
    }

    // MARK: - makeFrameHandler

    func testMakeFrameHandlerReturnsClosure() {
        let vm = PolyBansSessionViewModel()
        let handler = vm.makeFrameHandler()
        // Should not crash when called with no relay connected
        handler(Data([0x00]))
    }

    // MARK: - Error Surface

    func testHealthCheckFailureSetsErrorMessage() async throws {
        MockURLProtocol.handler = { _ in
            throw URLError(.notConnectedToInternet)
        }

        let vm = PolyBansSessionViewModel()
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)

        try await Task.sleep(for: .milliseconds(500))

        XCTAssertNotNil(vm.errorMessage)
        XCTAssertTrue(vm.errorMessage!.contains("Relay offline"))
    }

    func testHealthCheckSuccessClearsError() async throws {
        stubHealthOK()
        let vm = PolyBansSessionViewModel()
        vm.startSession(urlSessionConfiguration: MockURLProtocol.testConfiguration)

        try await Task.sleep(for: .milliseconds(200))
        XCTAssertNil(vm.errorMessage)
    }

    // MARK: - Helpers

    private var healthJSON: Data {
        """
        {"status":"ok","uptimeS":0,"framesIngested":0,"transcriptsIngested":0,"frameSubscribers":0,"transcriptSubscribers":0}
        """.data(using: .utf8)!
    }

    private func stubHealthOK() {
        MockURLProtocol.handler = { request in
            let json = """
            {"status":"ok","uptimeS":0,"framesIngested":0,"transcriptsIngested":0,"frameSubscribers":0,"transcriptSubscribers":0}
            """.data(using: .utf8)!
            return (json, MockURLProtocol.response(url: request.url!))
        }
    }

    private func stubAllEndpoints() {
        MockURLProtocol.handler = { request in
            if request.url?.path == "/health" {
                let json = """
                {"status":"ok","uptimeS":0,"framesIngested":0,"transcriptsIngested":0,"frameSubscribers":0,"transcriptSubscribers":0}
                """.data(using: .utf8)!
                return (json, MockURLProtocol.response(url: request.url!))
            }
            if request.url?.path == "/ingest/frame" {
                let json = """
                {"id":"f1234567","timestamp":1700000000000,"sizeBytes":100}
                """.data(using: .utf8)!
                return (json, MockURLProtocol.response(url: request.url!))
            }
            if request.url?.path == "/ingest/transcript" {
                let json = """
                {"id":"t1234567","text":"test","timestamp":1700000000000}
                """.data(using: .utf8)!
                return (json, MockURLProtocol.response(url: request.url!))
            }
            throw URLError(.badURL)
        }
    }

    private func createMinimalJPEG() -> Data {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 1, height: 1))
        let image = renderer.image { ctx in
            UIColor.red.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: 1, height: 1))
        }
        return image.jpegData(compressionQuality: 0.5)!
    }
}

// MARK: - Thread-safe counter for async tests

private final class LockedCounter: @unchecked Sendable {
    private var _value = 0
    private let lock = NSLock()

    var value: Int {
        lock.lock()
        defer { lock.unlock() }
        return _value
    }

    func increment() {
        lock.lock()
        _value += 1
        lock.unlock()
    }
}
