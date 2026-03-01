import SwiftUI

struct GradientButton: View {
    let title: String
    let icon: String
    let gradient: LinearGradient
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: icon)
                .font(.headline.bold())
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(gradient)
                .foregroundStyle(.white)
                .clipShape(RoundedRectangle(cornerRadius: PolyBansTheme.cornerRadius))
                .shadow(color: PolyBansTheme.accent.opacity(0.3), radius: 8, y: 4)
        }
    }
}
