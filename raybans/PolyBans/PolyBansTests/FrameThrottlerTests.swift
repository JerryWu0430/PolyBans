import XCTest
@testable import PolyBans

final class FrameThrottlerTests: XCTestCase {

    private func makeTestImage() -> UIImage {
        UIGraphicsBeginImageContext(CGSize(width: 1, height: 1))
        defer { UIGraphicsEndImageContext() }
        return UIGraphicsGetImageFromCurrentImageContext()!
    }

    func testFirstFrameAlwaysFires() {
        let throttler = FrameThrottler(interval: 1.0)
        var callCount = 0
        throttler.onThrottledFrame = { _ in callCount += 1 }

        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 1, "First frame should always fire")
    }

    func testSecondFrameWithinIntervalIsSuppressed() {
        let throttler = FrameThrottler(interval: 10.0) // Long interval
        var callCount = 0
        throttler.onThrottledFrame = { _ in callCount += 1 }

        throttler.submit(makeTestImage())
        throttler.submit(makeTestImage()) // Should be suppressed
        XCTAssertEqual(callCount, 1, "Second frame within interval should be suppressed")
    }

    func testFrameAfterIntervalFires() {
        let throttler = FrameThrottler(interval: 0.05) // 50ms interval
        var callCount = 0
        throttler.onThrottledFrame = { _ in callCount += 1 }

        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 1)

        // Wait for interval to pass
        let expectation = expectation(description: "wait for interval")
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            throttler.submit(self.makeTestImage())
            XCTAssertEqual(callCount, 2, "Frame after interval should fire")
            expectation.fulfill()
        }
        wait(for: [expectation], timeout: 1.0)
    }

    func testNilCallbackIsSafe() {
        let throttler = FrameThrottler(interval: 1.0)
        // onThrottledFrame is nil by default — submit should not crash
        throttler.submit(makeTestImage())
    }

    func testResetAllowsImmediateFrame() {
        let throttler = FrameThrottler(interval: 10.0)
        var callCount = 0
        throttler.onThrottledFrame = { _ in callCount += 1 }

        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 1)

        throttler.reset()
        throttler.submit(makeTestImage())
        XCTAssertEqual(callCount, 2, "Frame after reset should fire immediately")
    }
}
