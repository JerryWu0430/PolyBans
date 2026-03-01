# PolyBans

Real-time prediction market arbitrage using Meta Ray-Bans smart glasses. Stream live video + audio transcription → AI analysis → Polymarket opportunities.

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Meta Glasses  │────▶│   Relay Server   │────▶│   Web Dashboard │
│   (iOS App)     │     │   (Node.js)      │     │   (Next.js)     │
│                 │     │                  │     │                 │
│ • Video capture │     │ • Frame/text hub │     │ • Live video    │
│ • Speech-to-text│     │ • WebSocket fan- │     │ • Transcription │
│ • TTS playback  │     │   out to clients │     │ • Market cards  │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                        ┌────────▼─────────┐
                        │  Polymarket API  │
                        │  (Node.js)       │
                        │                  │
                        │ • Mistral AI     │
                        │ • Market search  │
                        │ • Gamma API      │
                        └──────────────────┘
```

## Tech Stack

| Component | Technologies |
|-----------|-------------|
| **iOS App** | Swift, SwiftUI, AVFoundation, Speech.framework |
| **Relay Server** | Node.js, Express, WebSocket, TypeScript |
| **Polymarket API** | Node.js, Express, Mistral AI, Gamma API |
| **Web Dashboard** | Next.js 16, React 19, TypeScript, TailwindCSS, Zustand |

## Project Structure

```
polybans/
├── raybans/           # iOS app for Meta glasses
│   └── PolyBans/
│       ├── PolyBansSessionViewModel.swift  # Main session orchestrator
│       ├── RelayClient.swift               # HTTP/WS relay communication
│       ├── SpeechTranscriber.swift         # Apple Speech-to-text
│       └── TTSPlayer.swift                 # Text-to-speech playback
│
├── relay-server/      # Frame + transcript relay hub
│   └── src/
│       ├── index.ts           # Express + WS server
│       ├── routes/            # REST endpoints
│       ├── ws/                # WebSocket handlers
│       └── forward/           # Polymarket forwarder
│
├── polymarket/        # AI analysis + market search
│   └── src/
│       ├── index.js           # Express + WS server
│       ├── services/
│       │   ├── mistral.js     # Mistral AI structured output
│       │   ├── polymarket.js  # Gamma API search + sparklines
│       │   └── buffer.js      # Transcript buffer (600 chars)
│       └── ws/
│           └── stream.js      # Live streaming handler
│
└── webapp/            # Next.js dashboard
    └── src/
        ├── app/               # Next.js app router
        ├── components/        # React components
        └── lib/
            ├── hooks/         # Custom hooks (relay, analysis)
            └── stores/        # Zustand state management
```

## Getting Started

### Prerequisites

- Node.js 20+
- pnpm (webapp) / npm (other services)
- Xcode 15+ (iOS app)
- Mistral API key

### Environment Variables

**polymarket/.env**
```bash
MISTRAL_API_KEY=your_key_here
PORT=3001  # optional, default 3001
```

**relay-server/.env**
```bash
PORT=8420  # optional, default 8420
POLYMARKET_WS_URL=ws://localhost:3001/api/stream  # optional
```

### Running Services

```bash
# 1. Start relay server
cd relay-server
npm install
npm run dev  # http://localhost:8420

# 2. Start polymarket API
cd polymarket
npm install
npm start    # http://localhost:3001

# 3. Start webapp
cd webapp
pnpm install
pnpm dev     # http://localhost:3000
```

### iOS App

1. Open `raybans/PolyBans/PolyBans.xcodeproj` in Xcode
2. Configure signing with your Apple Developer account
3. Build and run on device (camera requires physical device)

## API Endpoints

### Relay Server (`:8420`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `/health` | GET | Health check |
| `/ingest/frame` | POST | Upload JPEG frame |
| `/ingest/transcript` | POST | Push transcript text |
| `/ws/frames` | WS | Subscribe to frame stream |
| `/ws/transcript` | WS | Subscribe to transcript stream |
| `/ws/all` | WS | Subscribe to all events |

### Polymarket API (`:3001`)

| Endpoint | Type | Description |
|----------|------|-------------|
| `/health` | GET | Health check |
| `/api/analyze` | POST | One-shot transcript analysis |
| `/api/stream` | WS | Live streaming (primary) |

## Data Flow

1. **iOS App** captures video frames + speech → pushes to Relay Server
2. **Relay Server** fans out frames/transcripts to connected clients
3. **Polymarket API** buffers transcript (600 chars) → Mistral AI analysis → Gamma API market search
4. **Web Dashboard** displays video feed, live transcript, and market opportunities

## Testing

```bash
# Relay server tests
cd relay-server && npm test

# Webapp tests
cd webapp && pnpm test
```

## Key Features

- Real-time video streaming from Meta Ray-Bans
- Live speech-to-text transcription
- AI-powered prediction market detection (Mistral Large)
- Polymarket search with sparklines and volume data
- TTS feedback to glasses
- Dark mode dashboard

## Contributing

1. Create feature branch: `feat/short-description`
2. Commit format: `type(scope): description`
3. Submit PR with description from `/pr-description`

## License

Private - All rights reserved
