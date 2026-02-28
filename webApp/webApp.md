# PolyBans WebApp - Implementation Plan

## Overview
Polymarket arbitrage webapp w/ 2 modes: Ray-Bans (Meta glasses) + Web Live (YT/Twitch/X). Uses Mistral AI for analysis, pulls from Polymarket/Reddit.

## Tech Stack
- Next.js 14+ (App Router)
- TypeScript + shadcn/ui + Tailwind
- Zustand (state) + React Query (server state)
- WebSockets (local custom server)
- Mistral AI

## Architecture

### Folder Structure
```
webApp/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                    # Mode selector
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx              # Dashboard shell
│   │   │   ├── raybans/page.tsx
│   │   │   ├── weblive/page.tsx
│   │   │   └── arbitrage/page.tsx
│   │   └── api/
│   │       ├── polymarket/
│   │       │   ├── markets/route.ts
│   │       │   └── odds/route.ts
│   │       ├── analysis/
│   │       │   └── mistral/route.ts
│   │       ├── social/
│   │       │   └── reddit/route.ts   # public JSON, no auth
│   │       └── raybans/webhook/route.ts
│   ├── components/
│   │   ├── ui/                         # shadcn
│   │   ├── layout/                     # Sidebar, Header
│   │   ├── dashboard/                  # ArbitrageCard, OddsComparison
│   │   ├── raybans/                    # VideoFeed, TranscriptPanel
│   │   ├── weblive/                    # StreamInput, StreamPlayer
│   │   └── analysis/                   # MistralChat, AnalysisStream
│   └── lib/
│       ├── services/                   # polymarket, mistral, reddit
│       ├── websocket/                  # server, handlers, types
│       ├── hooks/                      # useWebSocket, usePolymarket, etc
│       ├── stores/                     # arbitrageStore, streamStore
│       ├── utils/                      # arbitrage calc, formatters
│       └── types/
├── server/
│   ├── index.ts                        # Custom server entry
│   └── websocket.ts                    # WS server
└── .env.local
```

### Data Flow
```
[OpenGlass/Mock] -> webhook -> WS Server -> broadcast
                                    |
                                    v
                            [Mistral Analysis]
                                    |
                                    v
[Polymarket API] <------ [Query Builder] -----> [ArbitrageCalc]
       |                                               |
       +--------> [Reddit Sentiment] <-----------------+
                         |
                         v
                  [ArbitrageList UI]
```

---

## Phase 1: Scaffold Next.js + shadcn (ISS-2)
**Priority: High**

### Setup Commands
```bash
npx create-next-app@latest webApp --typescript --tailwind --eslint --app --src-dir
cd webApp
npx shadcn@latest init
npx shadcn@latest add button card badge skeleton tabs input dialog
npm i zustand @tanstack/react-query
```

### Layout Components
- **Sidebar.tsx**: Logo, nav links (Ray-Bans, Web Live, Arbitrage), active indicator, collapsible mobile
- **Header.tsx**: Connection status badge, mode toggle switch
- **ModeToggle.tsx**: Visual switch between Ray-Bans/Web Live modes

### Env Template (.env.local)
```
MISTRAL_API_KEY=
POLYMARKET_WS_URL=wss://clob.polymarket.com/v1/ws
```

### Acceptance Criteria
- [ ] `npm run dev` works
- [ ] Routes /raybans, /weblive, /arbitrage render stub pages
- [ ] Sidebar navigation works
- [ ] shadcn components render correctly

---

## Phase 2: API Services (ISS-3)
**Priority: High**

### 1. Polymarket Service (`src/lib/services/polymarket.ts`)
```typescript
// Gamma API (REST) - https://gamma-api.polymarket.com
getMarkets(params?: { limit?, offset?, category? }): Promise<Market[]>
getMarket(id: string): Promise<Market>
searchMarkets(query: string): Promise<Market[]>

// CLOB WebSocket - wss://clob.polymarket.com/v1/ws
subscribeToOdds(marketIds: string[], onUpdate: (odds: Odds) => void): () => void
```

Types: `src/lib/types/polymarket.ts` - Market, Odds, OrderBook, PriceUpdate

### 2. Mistral Service (`src/lib/services/mistral.ts`)
```typescript
// npm i @mistralai/mistralai
analyzeTranscript(transcript: string, context: AnalysisContext): Promise<AnalysisResult>
streamAnalysis(transcript: string, onChunk: (chunk: string) => void): Promise<void>
```

System prompt for arbitrage extraction - extract entities (teams, candidates, events), suggest Polymarket queries, estimate confidence.

Types: `src/lib/types/analysis.ts` - AnalysisContext, AnalysisResult, ExtractedEntity

### 3. Reddit Service (`src/lib/services/reddit.ts`)
```typescript
// Public JSON endpoints (no auth needed)
// https://www.reddit.com/r/{subreddit}.json
getSubredditPosts(subreddit: string, limit?: number): Promise<RedditPost[]>
searchPosts(query: string): Promise<RedditPost[]>
getSentiment(query: string): Promise<SentimentResult>  // aggregate from r/polymarket, r/wallstreetbets
```

### API Routes
- `app/api/polymarket/markets/route.ts` - GET proxy to Gamma API
- `app/api/polymarket/odds/route.ts` - GET odds for market
- `app/api/analysis/mistral/route.ts` - POST streaming response via ReadableStream
- `app/api/social/reddit/route.ts` - GET sentiment aggregation

### Acceptance Criteria
- [ ] Can fetch Polymarket markets via API route
- [ ] Mistral streaming works in browser
- [ ] Reddit sentiment returns bullish/bearish/neutral score

---

## Phase 3: WebSocket Infrastructure (ISS-4)
**Priority: Medium**

### Custom Server (`server/`)
Next.js doesn't support WS natively - need custom server wrapping Next.js.

```typescript
// server/index.ts
import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { setupWebSocket } from './websocket'

const app = next({ dev: process.env.NODE_ENV !== 'production' })
const handle = app.getRequestHandler()
const server = createServer((req, res) => handle(req, res, parse(req.url!, true)))
setupWebSocket(server)
server.listen(3000)

// server/websocket.ts
import { WebSocketServer } from 'ws'
// Handle upgrade, manage connections, broadcast messages
```

### Message Types (`src/lib/websocket/types.ts`)
```typescript
type WSMessage =
  | { type: 'ODDS_UPDATE'; payload: OddsData }
  | { type: 'TRANSCRIPT_CHUNK'; payload: { text: string; timestamp: number } }
  | { type: 'ANALYSIS_RESULT'; payload: AnalysisResult }
  | { type: 'ARBITRAGE_OPPORTUNITY'; payload: ArbitrageOpp }
  | { type: 'CONNECTION_STATUS'; payload: 'connected' | 'disconnected' }
```

### Client Hook (`src/lib/hooks/useWebSocket.ts`)
```typescript
useWebSocket(): {
  isConnected: boolean
  send: (msg: WSMessage) => void
  subscribe: (type: string, handler: (payload) => void) => () => void
}
// Auto-reconnect on disconnect, exponential backoff
```

### Zustand Stores

**arbitrageStore.ts**
```typescript
opportunities: ArbitrageOpp[]
selectedMarket: Market | null
filters: { minConfidence: number; minSpread: number }
actions: addOpportunity, removeOpportunity, setFilters
```

**streamStore.ts**
```typescript
mode: 'raybans' | 'weblive' | null
transcript: TranscriptChunk[]
isConnected: boolean
currentAnalysis: AnalysisResult | null
actions: appendTranscript, setAnalysis, reset
```

### Package.json script
```json
"dev": "ts-node server/index.ts"
```

### Acceptance Criteria
- [ ] WS connects on page load
- [ ] Messages broadcast to all clients
- [ ] Stores update reactively in UI

---

## Phase 4: Ray-Bans Mode (ISS-5)
**Priority: Medium**

### Webhook Endpoint (`app/api/raybans/webhook/route.ts`)
```typescript
// POST - receives data from Mike's OpenGlass endpoint
// Expected payload (confirm with Mike):
{
  frame?: string       // base64 JPEG or URL
  transcript: string   // speech-to-text chunk
  timestamp: number
}
// Broadcast to WS clients, trigger Mistral analysis on threshold
```

### Mock Stream Generator (`src/lib/utils/mockStream.ts`)
Until Mike's OpenGlass is ready, simulate:
```typescript
generateMockTranscript(): TranscriptChunk
// Returns sports/political commentary chunks every 2-3s
// "And the Lakers take a 10 point lead in the 4th quarter..."
// "The candidate just announced their position on tariffs..."

startMockStream(onChunk: (chunk) => void): () => void
// Returns cleanup function
```

### Components (`src/components/raybans/`)

**VideoFeed.tsx**
- Display video stream (MJPEG img refresh or HLS.js)
- Fallback to placeholder when mock
- Fullscreen toggle, connection indicator overlay

**TranscriptPanel.tsx** (shared with Web Live)
- Scrolling transcript, auto-scroll to bottom
- Timestamp per chunk
- Highlight keywords (team names, candidates, scores)

**AnalysisOverlay.tsx**
- Streaming Mistral output display
- Show extracted entities as badges
- Suggested Polymarket queries as clickable chips
- Confidence score indicator

### Page Layout (`app/(dashboard)/raybans/page.tsx`)
```
┌─────────────┬─────────────┐
│  VideoFeed  │ Transcript  │
│             │   Panel     │
├─────────────┴─────────────┤
│     AnalysisOverlay       │
├───────────────────────────┤
│     ArbitrageList         │
└───────────────────────────┘
```

### Acceptance Criteria
- [ ] Mock stream generates transcript chunks
- [ ] Transcript appears in panel
- [ ] Mistral analyzes every ~30s of transcript
- [ ] Arbitrage cards appear from analysis

---

## Phase 5: Web Live Mode (ISS-6)
**Priority: Medium**

### Components (`src/components/weblive/`)

**StreamInput.tsx**
- URL input field with validation
- Detect platform from URL pattern:
  - YouTube: youtube.com/watch, youtu.be, youtube.com/live
  - Twitch: twitch.tv/{channel}
  - X/Twitter: twitter.com/i/broadcasts, x.com/i/broadcasts
- Extract video/stream ID
- Error states for invalid URLs

**PlatformSelector.tsx**
- Toggle tabs: YouTube | Twitch | X
- Platform icons, visual indicator
- Updates StreamInput placeholder

**StreamPlayer.tsx**
- Embed iframe based on platform:
  - YouTube: `youtube.com/embed/{id}?autoplay=1`
  - Twitch: `player.twitch.tv/?channel={channel}&parent=localhost`
  - X: `platform.twitter.com/embed/Tweet.html` (limited)
- Responsive 16:9 aspect ratio
- Loading skeleton

### Transcription (Mock for MVP)
Real browser audio capture is complex (getDisplayMedia + Web Speech API). For MVP:
- Reuse `mockStream.ts` from Ray-Bans
- Add "Start Mock Transcript" button
- Same format feeds into analysis pipeline

**TODO for future**: Browser audio capture -> Web Speech API or AssemblyAI

### Page Layout (`app/(dashboard)/weblive/page.tsx`)
```
┌─────────────────────────────┐
│ PlatformSelector            │
├─────────────────────────────┤
│ StreamInput                 │
├─────────────┬───────────────┤
│ StreamPlayer│ TranscriptPanel│
│             │  (reuse)      │
├─────────────┴───────────────┤
│     AnalysisOverlay (reuse) │
├─────────────────────────────┤
│     ArbitrageList           │
└─────────────────────────────┘
```

### Acceptance Criteria
- [ ] Paste YouTube URL -> embed plays
- [ ] Paste Twitch URL -> embed plays
- [ ] Mock transcript works same as Ray-Bans
- [ ] Analysis pipeline produces arbitrage cards

---

## Phase 6: Arbitrage Dashboard (ISS-7)
**Priority: Low**

### Components (`src/components/dashboard/`)

**ArbitrageCard.tsx**
- Single opportunity display:
  - Market title (truncated)
  - Current Polymarket odds (e.g., "YES 65¢")
  - Suggested position badge (YES/NO)
  - Confidence % bar
  - Spread % highlight (green if >5%)
  - Source badges (Mistral, Reddit)
- Click to expand: full analysis, market link

**ArbitrageList.tsx**
- List of ArbitrageCards
- Filters: min confidence slider, min spread slider
- Sort: by spread (default), by time, by confidence
- Real-time updates via WS subscription
- Empty state: "Waiting for opportunities..."

**OddsComparison.tsx**
- Side-by-side chart (use recharts or tremor)
- Compare: Polymarket odds vs LLM prediction vs sentiment signal
- Visual divergence indicator

**SentimentGauge.tsx**
- Circular/linear gauge showing Reddit sentiment
- Bullish (green) <- Neutral -> Bearish (red)
- Post count indicator
- Last updated timestamp

**MarketTrends.tsx**
- Trending Polymarket markets list
- Show: title, volume, 24h price change %
- Category tags (Sports, Politics, Crypto)
- Click to add to watchlist / view details

### Arbitrage Utils (`src/lib/utils/arbitrage.ts`)
```typescript
calculateSpread(polymarketOdds: number, llmPrediction: number): number
scoreOpportunity(spread: number, sentiment: number, confidence: number): number
rankOpportunities(opps: ArbitrageOpp[]): ArbitrageOpp[]
```

### Page Layout (`app/(dashboard)/arbitrage/page.tsx`)
```
┌───────────┬─────────────────────────┐
│           │    OddsComparison       │
│  Market   ├─────────────────────────┤
│  Trends   │    SentimentGauge       │
│  (sidebar)├─────────────────────────┤
│           │    ArbitrageList        │
│           │    (main content)       │
└───────────┴─────────────────────────┘
```

### Data Flow
- React Query: fetch markets, sentiment on interval
- Zustand: arbitrage opportunities from WS
- Combine in page component

### Acceptance Criteria
- [ ] Dashboard shows live Polymarket trends
- [ ] Reddit sentiment gauge updates
- [ ] Arbitrage cards from both modes appear here
- [ ] Filters work correctly

---

## Verification Checklist
1. `npm run dev` - starts Next.js + custom WS server
2. Open localhost:3000 - see mode selector
3. Ray-Bans mode: mock webhook -> transcript -> Mistral -> arbitrage card
4. Web Live mode: paste YT URL -> embed -> mock transcript -> same flow
5. Arbitrage page: real-time Polymarket odds + Reddit sentiment

## Unresolved
- Mike's OpenGlass endpoint format (video: MJPEG/HLS? transcript: WS/SSE?)
