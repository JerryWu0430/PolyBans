import SwiftUI

struct GlassCard: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding(16)
            .background(
                RoundedRectangle(cornerRadius: PolyBansTheme.cornerRadius)
                    .fill(PolyBansTheme.backgroundCard.opacity(0.6))
                    .background(
                        RoundedRectangle(cornerRadius: PolyBansTheme.cornerRadius)
                            .fill(.ultraThinMaterial)
                    )
            )
            .overlay(
                RoundedRectangle(cornerRadius: PolyBansTheme.cornerRadius)
                    .stroke(PolyBansTheme.cardBorderGradient, lineWidth: 1)
            )
    }
}

extension View {
    func glassCard() -> some View {
        modifier(GlassCard())
    }
}
