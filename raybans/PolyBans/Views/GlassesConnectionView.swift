import MWDATCore
import SwiftUI

struct GlassesConnectionView: View {
    @ObservedObject var glasses: GlassesCameraManager

    var body: some View {
        List {
            // MARK: Status
            Section("Status") {
                LabeledContent("Connection") {
                    Text(glasses.isConnected ? "Connected" : "Disconnected")
                        .foregroundStyle(glasses.isConnected ? .green : .secondary)
                }
                LabeledContent("Devices") {
                    Text("\(glasses.devices.count)")
                }
                LabeledContent("Active Device") {
                    Text(glasses.hasActiveDevice ? "Yes" : "No")
                }
                LabeledContent("Stream") {
                    Text(String(describing: glasses.streamState))
                }
            }

            // MARK: Pairing
            Section("Pairing") {
                switch glasses.registrationState {
                case .unavailable:
                    Text("Bluetooth unavailable")
                        .foregroundStyle(.secondary)
                case .available:
                    Button("Pair Glasses") {
                        glasses.pair()
                    }
                case .registering:
                    HStack {
                        ProgressView()
                        Text("Pairing...")
                    }
                case .registered:
                    HStack {
                        Image(systemName: "checkmark.circle.fill")
                            .foregroundStyle(.green)
                        Text("Paired")
                    }
                    Button("Unpair", role: .destructive) {
                        glasses.unpair()
                    }
                @unknown default:
                    Text("Unknown state")
                }
            }

            // MARK: Devices
            if !glasses.devices.isEmpty {
                Section("Devices") {
                    ForEach(glasses.devices, id: \.self) { deviceId in
                        Text(deviceId)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }

            // MARK: Error
            if let error = glasses.errorMessage {
                Section("Error") {
                    Text(error)
                        .foregroundStyle(.red)
                }
            }
        }
        .navigationTitle("Meta Glasses")
    }
}
