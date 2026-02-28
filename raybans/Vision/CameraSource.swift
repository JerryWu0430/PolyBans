import UIKit

protocol CameraSource: AnyObject {
    var onFrameCaptured: ((UIImage) -> Void)? { get set }
    func start()
    func stop()
}
