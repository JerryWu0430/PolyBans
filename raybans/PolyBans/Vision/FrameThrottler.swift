import UIKit

final class FrameThrottler {

    var onThrottledFrame: ((UIImage) -> Void)?

    private let interval: TimeInterval
    private var lastFrameTime: CFAbsoluteTime = 0

    init(interval: TimeInterval = 1.0) {
        self.interval = interval
    }

    func submit(_ image: UIImage) {
        let now = CFAbsoluteTimeGetCurrent()
        guard now - lastFrameTime >= interval else { return }
        lastFrameTime = now
        onThrottledFrame?(image)
    }

    func reset() {
        lastFrameTime = 0
    }
}
