import MWDATCore
import SwiftUI

@main
struct PolyBansApp: App {
    @StateObject private var vm = PolyBansSessionViewModel()

    init() {
        do {
            try Wearables.configure()
            NSLog("[PolyBans] Wearables SDK configured")
        } catch {
            NSLog("[PolyBans] Wearables.configure() FAILED: %@", "\(error)")
        }
    }

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onOpenURL { url in
                    guard
                        let components = URLComponents(url: url, resolvingAgainstBaseURL: false),
                        components.queryItems?.contains(where: { $0.name == "metaWearablesAction" }) == true
                    else { return }
                    Task {
                        do {
                            _ = try await Wearables.shared.handleUrl(url)
                        } catch {
                            NSLog("[PolyBans] handleUrl error: %@", "\(error)")
                        }
                    }
                }
        }
    }
}
