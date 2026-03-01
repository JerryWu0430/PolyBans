import SwiftUI

struct ContentView: View {
    @ObservedObject var vm: PolyBansSessionViewModel

    // Reads from Info.plist first so values are editable in Xcode.
    private var relayHost: String {
        let infoValue = (Bundle.main.object(forInfoDictionaryKey: "RelayHost") as? String)?
            .trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        if !infoValue.isEmpty { return infoValue }

        let envValue = (ProcessInfo.processInfo.environment["RELAY_HOST"] ?? "")
            .trimmingCharacters(in: .whitespacesAndNewlines)
        return envValue.isEmpty ? "172.20.10.3" : envValue
    }

    private var relayPort: Int {
        if let number = Bundle.main.object(forInfoDictionaryKey: "RelayPort") as? NSNumber {
            return number.intValue
        }
        if let text = Bundle.main.object(forInfoDictionaryKey: "RelayPort") as? String,
           let port = Int(text) {
            return port
        }
        if let envPort = Int(ProcessInfo.processInfo.environment["RELAY_PORT"] ?? "") {
            return envPort
        }
        return 8420
    }

    var body: some View {
        ZStack {
            // MARK: - Background
            LinearGradient(
                colors: [
                    PolyBansTheme.backgroundPrimary,
                    PolyBansTheme.backgroundSecondary,
                    PolyBansTheme.backgroundPrimary
                ],
                startPoint: .top,
                endPoint: .bottom
            )
            .ignoresSafeArea()

            VStack(spacing: 0) {
                ScrollView {
                    VStack(spacing: 16) {
                        // MARK: - Header
                        HStack {
                            Text("PolyBans")
                                .font(.largeTitle.bold())
                                .foregroundStyle(.white)

                            Spacer()

                            NavigationLink {
                                GlassesConnectionView(glasses: vm.glassesManager)
                            } label: {
                                Image(systemName: "eyeglasses")
                                    .font(.title2)
                                    .foregroundStyle(PolyBansTheme.accent)
                                    .padding(10)
                                    .background(
                                        Circle()
                                            .fill(PolyBansTheme.backgroundCard.opacity(0.6))
                                    )
                                    .overlay(
                                        Circle()
                                            .stroke(PolyBansTheme.cardBorderGradient, lineWidth: 1)
                                    )
                            }
                        }
                        .padding(.horizontal)
                        .padding(.top, 8)

                        // MARK: - Status Row
                        HStack(spacing: 20) {
                            StatusPill(
                                label: "Relay",
                                isActive: vm.relayConnected
                            )
                            StatusPill(
                                label: "Glasses",
                                isActive: vm.glassesManager.isConnected
                            )
                        }
                        .frame(maxWidth: .infinity)
                        .glassCard()
                        .padding(.horizontal)

                        // MARK: - Camera Preview
                        VStack(spacing: 12) {
                            if let frame = vm.latestFrame {
                                Image(uiImage: frame)
                                    .resizable()
                                    .scaledToFit()
                                    .frame(maxHeight: 200)
                                    .clipShape(RoundedRectangle(cornerRadius: PolyBansTheme.cornerRadiusSmall))
                            } else if vm.cameraActive {
                                VStack(spacing: 8) {
                                    ProgressView()
                                        .tint(PolyBansTheme.accent)
                                    Text("Waiting for frames...")
                                        .font(.caption)
                                        .foregroundStyle(PolyBansTheme.textSecondary)
                                }
                                .frame(maxWidth: .infinity, minHeight: 120)
                            } else {
                                VStack(spacing: 8) {
                                    Image(systemName: "video.slash")
                                        .font(.title)
                                        .foregroundStyle(PolyBansTheme.textSecondary)
                                    Text("Camera off")
                                        .font(.caption)
                                        .foregroundStyle(PolyBansTheme.textSecondary)
                                }
                                .frame(maxWidth: .infinity, minHeight: 120)
                            }

                            Button {
                                if vm.cameraActive {
                                    vm.stopCamera()
                                } else {
                                    vm.startCamera()
                                }
                            } label: {
                                Label(
                                    vm.cameraActive ? "Stop Camera" : "Start Camera",
                                    systemImage: vm.cameraActive ? "video.slash.fill" : "video.fill"
                                )
                                .font(.subheadline.bold())
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 10)
                                .foregroundStyle(vm.cameraActive ? PolyBansTheme.statusAmber : PolyBansTheme.accent)
                                .overlay(
                                    RoundedRectangle(cornerRadius: PolyBansTheme.cornerRadiusSmall)
                                        .stroke(
                                            vm.cameraActive ? PolyBansTheme.statusAmber : PolyBansTheme.accent,
                                            lineWidth: 1.5
                                        )
                                )
                            }
                        }
                        .glassCard()
                        .padding(.horizontal)

                        // MARK: - Live Transcript
                        VStack(alignment: .leading, spacing: 10) {
                            HStack(spacing: 6) {
                                Image(systemName: "waveform")
                                    .foregroundStyle(PolyBansTheme.accent)
                                Text("Live Transcript")
                                    .font(.subheadline.bold())
                                    .foregroundStyle(PolyBansTheme.textPrimary)
                            }

                            Text(vm.userTranscript.isEmpty ? "Waiting for speech..." : vm.userTranscript)
                                .font(.body)
                                .foregroundStyle(
                                    vm.userTranscript.isEmpty
                                        ? PolyBansTheme.textSecondary
                                        : PolyBansTheme.textPrimary
                                )
                                .frame(maxWidth: .infinity, minHeight: 80, alignment: .topLeading)
                        }
                        .glassCard()
                        .padding(.horizontal)

                        // MARK: - Stats Row
                        HStack(spacing: 12) {
                            StatCard(
                                icon: "text.bubble",
                                value: "\(vm.transcriptsSent)",
                                label: "Transcripts"
                            )
                            StatCard(
                                icon: "camera.viewfinder",
                                value: "\(vm.framesSent)",
                                label: "Frames"
                            )
                        }
                        .padding(.horizontal)

                        // MARK: - Error Banner
                        if let error = vm.errorMessage {
                            HStack(spacing: 8) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(PolyBansTheme.statusRed)
                                Text(error)
                                    .font(.caption)
                                    .foregroundStyle(PolyBansTheme.statusRed)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .glassCard()
                            .padding(.horizontal)
                        }
                    }
                    .padding(.bottom, 100)
                }

                Spacer(minLength: 0)
            }

            // MARK: - Floating Session Button
            VStack {
                Spacer()
                GradientButton(
                    title: vm.isActive ? "Stop Session" : "Start Session",
                    icon: vm.isActive ? "stop.circle.fill" : "mic.circle.fill",
                    gradient: vm.isActive
                        ? PolyBansTheme.sessionActiveGradient
                        : PolyBansTheme.sessionInactiveGradient
                ) {
                    Task { @MainActor in
                        if vm.isActive {
                            vm.stopSession()
                        } else {
                            await vm.startSession(host: relayHost, port: relayPort)
                        }
                    }
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
            }
        }
        .navigationBarHidden(true)
    }
}

// MARK: - StatusPill

private struct StatusPill: View {
    let label: String
    let isActive: Bool

    var body: some View {
        HStack(spacing: 6) {
            PulsingDot(isActive: isActive)
            Text(label)
                .font(.subheadline)
                .foregroundStyle(PolyBansTheme.textSecondary)
        }
    }
}

// MARK: - StatCard

private struct StatCard: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(PolyBansTheme.accent)
            Text(value)
                .font(.title2.bold())
                .foregroundStyle(PolyBansTheme.textPrimary)
            Text(label)
                .font(.caption)
                .foregroundStyle(PolyBansTheme.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .glassCard()
    }
}

#Preview {
    NavigationStack {
        ContentView(vm: PolyBansSessionViewModel())
    }
    .preferredColorScheme(.dark)
}
