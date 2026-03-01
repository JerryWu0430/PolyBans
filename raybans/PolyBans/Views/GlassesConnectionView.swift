import MWDATCore
import SwiftUI

struct GlassesConnectionView: View {
    @ObservedObject var glasses: GlassesCameraManager

    var body: some View {
        ZStack {
            PolyBansTheme.backgroundPrimary
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: 16) {

                    // MARK: - Status Section
                    VStack(spacing: 0) {
                        StatusRow(title: "Connection",
                                  value: glasses.isConnected ? "Connected" : "Disconnected",
                                  valueColor: glasses.isConnected ? PolyBansTheme.statusGreen : PolyBansTheme.textSecondary)
                        Divider().background(Color.white.opacity(0.1))
                        StatusRow(title: "Devices",
                                  value: "\(glasses.devices.count)",
                                  valueColor: PolyBansTheme.textSecondary)
                        Divider().background(Color.white.opacity(0.1))
                        StatusRow(title: "Active Device",
                                  value: glasses.hasActiveDevice ? "Yes" : "No",
                                  valueColor: glasses.hasActiveDevice ? PolyBansTheme.statusGreen : PolyBansTheme.textSecondary)
                        Divider().background(Color.white.opacity(0.1))
                        StatusRow(title: "Stream",
                                  value: String(describing: glasses.streamState),
                                  valueColor: PolyBansTheme.textSecondary)
                    }
                    .glassCard()

                    // MARK: - Pairing Section
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Pairing")
                            .font(.subheadline.bold())
                            .foregroundStyle(PolyBansTheme.textPrimary)

                        switch glasses.registrationState {
                        case .unavailable:
                            HStack(spacing: 8) {
                                Image(systemName: "antenna.radiowaves.left.and.right.slash")
                                    .foregroundStyle(PolyBansTheme.textSecondary)
                                Text("Bluetooth unavailable")
                                    .foregroundStyle(PolyBansTheme.textSecondary)
                            }

                        case .available:
                            GradientButton(
                                title: "Pair Glasses",
                                icon: "eyeglasses",
                                gradient: PolyBansTheme.sessionInactiveGradient
                            ) {
                                glasses.pair()
                            }

                        case .registering:
                            HStack(spacing: 8) {
                                ProgressView()
                                    .tint(PolyBansTheme.accent)
                                Text("Pairing...")
                                    .foregroundStyle(PolyBansTheme.textSecondary)
                            }

                        case .registered:
                            HStack(spacing: 8) {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(PolyBansTheme.statusGreen)
                                Text("Paired")
                                    .foregroundStyle(PolyBansTheme.statusGreen)
                            }

                            Button {
                                glasses.unpair()
                            } label: {
                                Label("Unpair", systemImage: "xmark.circle")
                                    .font(.subheadline.bold())
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .foregroundStyle(PolyBansTheme.statusRed)
                                    .overlay(
                                        RoundedRectangle(cornerRadius: PolyBansTheme.cornerRadiusSmall)
                                            .stroke(PolyBansTheme.statusRed, lineWidth: 1.5)
                                    )
                            }

                        @unknown default:
                            Text("Unknown state")
                                .foregroundStyle(PolyBansTheme.textSecondary)
                        }
                    }
                    .glassCard()

                    // MARK: - Devices Section
                    if !glasses.devices.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Text("Devices")
                                .font(.subheadline.bold())
                                .foregroundStyle(PolyBansTheme.textPrimary)
                            ForEach(glasses.devices, id: \.self) { deviceId in
                                Text(deviceId)
                                    .font(.caption.monospaced())
                                    .foregroundStyle(PolyBansTheme.textSecondary)
                            }
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .glassCard()
                    }

                    // MARK: - Error Section
                    if let error = glasses.errorMessage {
                        HStack(spacing: 8) {
                            Image(systemName: "exclamationmark.triangle.fill")
                                .foregroundStyle(PolyBansTheme.statusRed)
                            Text(error)
                                .font(.caption)
                                .foregroundStyle(PolyBansTheme.statusRed)
                        }
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .glassCard()
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Meta Glasses")
        .toolbarColorScheme(.dark, for: .navigationBar)
    }
}

// MARK: - StatusRow

private struct StatusRow: View {
    let title: String
    let value: String
    let valueColor: Color

    var body: some View {
        HStack {
            Text(title)
                .font(.subheadline)
                .foregroundStyle(PolyBansTheme.textSecondary)
            Spacer()
            Text(value)
                .font(.subheadline.bold())
                .foregroundStyle(valueColor)
        }
        .padding(.vertical, 8)
    }
}
