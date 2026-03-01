import SwiftUI

enum PolyBansTheme {
    // MARK: - Background Colors
    static let backgroundPrimary   = Color(hex: "0A0E17")
    static let backgroundSecondary = Color(hex: "111827")
    static let backgroundCard      = Color(hex: "1A1F2E")

    // MARK: - Accent
    static let accent = Color(hex: "00D4FF")

    // MARK: - Status Colors
    static let statusGreen  = Color(hex: "10B981")
    static let statusRed    = Color(hex: "EF4444")
    static let statusAmber  = Color(hex: "F59E0B")

    // MARK: - Text
    static let textPrimary   = Color.white
    static let textSecondary = Color.white.opacity(0.6)

    // MARK: - Gradients
    static let sessionActiveGradient = LinearGradient(
        colors: [Color(hex: "EF4444"), Color(hex: "DC2626")],
        startPoint: .leading,
        endPoint: .trailing
    )
    static let sessionInactiveGradient = LinearGradient(
        colors: [Color(hex: "00D4FF"), Color(hex: "0099CC")],
        startPoint: .leading,
        endPoint: .trailing
    )
    static let cardBorderGradient = LinearGradient(
        colors: [Color.white.opacity(0.15), Color.white.opacity(0.05)],
        startPoint: .topLeading,
        endPoint: .bottomTrailing
    )

    // MARK: - Corner Radius
    static let cornerRadius: CGFloat = 16
    static let cornerRadiusSmall: CGFloat = 10
}

// MARK: - Color Hex Init

extension Color {
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: .alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)
        let r, g, b: Double
        switch hex.count {
        case 6:
            r = Double((int >> 16) & 0xFF) / 255
            g = Double((int >> 8)  & 0xFF) / 255
            b = Double(int         & 0xFF) / 255
        default:
            r = 0; g = 0; b = 0
        }
        self.init(red: r, green: g, blue: b)
    }
}
