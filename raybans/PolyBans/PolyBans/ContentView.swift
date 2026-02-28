//
//  ContentView.swift
//  PolyBans
//

import SwiftUI

struct ContentView: View {
    @StateObject private var vm = PolyBansSessionViewModel()

    // Mac's local IP — relay-server runs here on port 8420
    private let relayHost = "10.1.92.4"
    private let relayPort = 8420

    var body: some View {
        NavigationView {
            VStack(spacing: 24) {

                // MARK: Status
                HStack(spacing: 8) {
                    Circle()
                        .fill(vm.relayConnected ? Color.green : Color.red)
                        .frame(width: 10, height: 10)
                    Text(vm.relayConnected ? "Relay connected" : "Relay disconnected")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }

                // MARK: Transcript
                GroupBox("Live Transcript") {
                    Text(vm.userTranscript.isEmpty ? "Waiting for speech…" : vm.userTranscript)
                        .font(.body)
                        .foregroundStyle(vm.userTranscript.isEmpty ? .secondary : .primary)
                        .frame(maxWidth: .infinity, minHeight: 100, alignment: .topLeading)
                        .padding(4)
                }

                // MARK: Counters
                HStack(spacing: 32) {
                    VStack {
                        Text("\(vm.transcriptsSent)")
                            .font(.title2.bold())
                        Text("Transcripts")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    VStack {
                        Text("\(vm.framesSent)")
                            .font(.title2.bold())
                        Text("Frames")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }

                // MARK: Error
                if let error = vm.errorMessage {
                    Text(error)
                        .font(.caption)
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.center)
                }

                Spacer()

                // MARK: Start / Stop
                Button {
                    Task { @MainActor in
                        if vm.isActive {
                            await vm.stopSession()
                        } else {
                            await vm.startSession(host: relayHost, port: relayPort)
                        }
                    }
                } label: {
                    Label(
                        vm.isActive ? "Stop Session" : "Start Session",
                        systemImage: vm.isActive ? "stop.circle.fill" : "mic.circle.fill"
                    )
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(vm.isActive ? Color.red : Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
                .padding(.horizontal)
            }
            .padding()
            .navigationTitle("PolyBans")
        }
    }
}

#Preview {
    ContentView()
}

