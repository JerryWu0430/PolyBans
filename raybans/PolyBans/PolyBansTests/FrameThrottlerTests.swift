import XCTest
@testable import PolyBans

@MainActor
final class FrameThrottlerTests: XCTestCase {

    private var throttler: FrameThrottler!
    private var callCount = 0

    override func setUp() {
        super.setUp()
        callCount = 0
    }

    override func tearDown() {
        throttler = nil
        super.tearDown()
    }

    private func makeTestImage() -> UIImage {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: 1, height: 1))
        return renderer.image { ctx in
            UIColor.red.setFill()
            ctx.fill(CGRect(x: 0, y: 0, width: 1, height: 1))
        }
    }

    func testFirstFrameAlwaysFires() {
        throttler = FrameThrottler(interval: 1.0)
        throttler.onThrottledFrame = { [weak self] _ in self?.callCount += 1 }

        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 1, "First frame should always fire")
    }

    func testSecondFrameWithinIntervalIsSuppressed() {
        throttler = FrameThrottler(interval: 10.0)
        throttler.onThrottledFrame = { [weak self] _ in self?.callCount += 1 }

        throttler.submit(makeTestImage())
        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 1, "Second frame within interval should be suppressed")
    }

    func testFrameAfterIntervalFires() {
        throttler = FrameThrottler(interval: 0.05)
        throttler.onThrottledFrame = { [weak self] _ in self?.callCount += 1 }

        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 1)

        let expectation = expectation(description: "wait for interval")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [self] in
            self.throttler.submit(self.makeTestImage())
            XCTAssertEqual(self.callCount, 2, "Frame after interval should fire")
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 1.0)
    }

    func testNilCallbackIsSafe() {
        throttler = FrameThrottler(interval: 1.0)
        // onThrottledFrame is nil by default — submit should not crash
        throttler.submit(makeTestImage())
    }

    func testResetAllowsImmediateFrame() {
        throttler = FrameThrottler(interval: 10.0)
        throttler.onThrottledFrame = { [weak self] _ in self?.callCount += 1 }

        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 1)

        throttler.reset()
        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 2, "Frame after reset should fire immediately")
    }
}
