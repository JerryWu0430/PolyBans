import SwiftUI

struct PulsingDot: View {
    let isActive: Bool
    var activeColor: Color = PolyBansTheme.statusGreen
    var inactiveColor: Color = PolyBansTheme.statusRed

    @State private var isPulsing = false

    var color: Color { isActive ? activeColor : inactiveColor }

    var body: some View {
        Circle()
            .fill(color)
            .frame(width: 8, height: 8)
            .shadow(color: isActive ? color.opacity(0.6) : .clear, radius: isPulsing ? 6 : 2)
            .scaleEffect(isActive && isPulsing ? 1.3 : 1.0)
            .animation(
                isActive
                    ? .easeInOut(duration: 1.0).repeatForever(autoreverses: true)
                    : .default,
                value: isPulsing
            )
            .onChange(of: isActive) { _, active in
                isPulsing = active
            }
            .onAppear {
                isPulsing = isActive
            }
    }
}
