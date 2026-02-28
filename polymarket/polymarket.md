# Polymarket API — Integration Docs

> **Role in PolyBans:** Middle layer. Receives live transcript from **raybans** (upstream), analyses it with Mistral AI, queries Polymarket, and pushes market data to **webApp** (downstream).

**Base URL:** `http://localhost:3001` (configurable via `PORT` env var)

---

## Endpoints at a Glance

| Endpoint | Method | Purpose | Consumer |
|---|---|---|---|
| `ws://host:3001/api/stream` | WebSocket | Live transcript streaming (primary) | raybans, webApp |
| `http://host:3001/api/analyze` | POST | One-shot analysis (testing/fallback) | webApp, curl |
| `http://host:3001/health` | GET | Readiness check | any |

---

## 1. `WS /api/stream` — Live Streaming (Primary)

Persistent WebSocket connection. The **raybans** side streams transcript chunks as the Meta glasses produce them. The server buffers internally (600-char threshold, 200-char context overlap) and pushes results back when ready — consumed by **webApp** or any connected client.

### Connecting

```javascript
const ws = new WebSocket('ws://localhost:3001/api/stream')
```

### Client → Server Messages

#### `transcript` — Send a chunk of transcript text

```json
{ "type": "transcript", "text": "the referee just showed a red card" }
```

- Call this every time the glasses STT emits new text (can be a sentence, a few words, etc.)
- Server buffers internally — no need to batch on the client side

#### `stop` — End the current session

```json
{ "type": "stop" }
```

- Clears the server-side buffer for this connection
- Server responds with `{ "type": "stopped" }`

### Server → Client Messages

#### `buffering` — Buffer progress update

Sent after every `transcript` message so the client knows how close to analysis threshold.

```json
{ "type": "buffering", "chars": 342, "threshold": 600 }
```

| Field | Type | Description |
|---|---|---|
| `chars` | `number` | Current buffer length |
| `threshold` | `number` | Chars needed before analysis fires (600) |

#### `analysis` — Mistral AI result

Sent when the buffer threshold is hit and Mistral has analysed the transcript.

```json
{
  "type": "analysis",
  "data": {
    "detected": true,
    "queries": ["Champions League final", "Real Madrid Barcelona", "UCL winner 2026"],
    "tag": "sports",
    "reason": "Late goal in UCL final — match outcome market"
  }
}
```

| Field | Type | Description |
|---|---|---|
| `data.detected` | `boolean` | Whether a prediction market topic was found |
| `data.queries` | `string[]` | 1-3 Polymarket search queries |
| `data.tag` | `string \| null` | Category: `politics`, `crypto`, `sports`, `business`, `science`, `pop-culture` |
| `data.reason` | `string` | Concise summary (≤20 words) |

#### `markets` — Polymarket search results

Sent after `analysis` if `detected === true` and markets were found.

```json
{
  "type": "markets",
  "data": {
    "reason": "Late goal in UCL final — match outcome market",
    "queries": ["Champions League final", "Real Madrid Barcelona"],
    "markets": [
      {
        "id": "12345",
        "slug": "champions-league-winner-2026",
        "title": "Champions League Winner 2025-26",
        "question": "Who will win the 2025-26 UEFA Champions League?",
        "volume": "1500000",
        "markets": [
          {
            "id": "67890",
            "outcomePrices": "[\"0.65\", \"0.35\"]",
            "outcomes": "[\"Yes\", \"No\"]"
          }
        ],
        "sparkline": [0.52, 0.55, 0.61, 0.65],
        "image": "https://polymarket-upload.s3.amazonaws.com/..."
      }
    ]
  }
}
```

**Market object fields:**

| Field | Type | Description |
|---|---|---|
| `id` | `string` | Polymarket event ID |
| `slug` | `string` | URL slug — use as `polymarket.com/event/{slug}` |
| `title` | `string` | Event title |
| `question` | `string` | Market question |
| `volume` | `string` | Total trading volume (in USD cents) |
| `markets` | `array` | Up to 2 outcome sub-markets with prices |
| `sparkline` | `number[]` | Historical price points for the "Yes" outcome |
| `image` | `string \| null` | Event thumbnail URL |

#### `error` — Something went wrong

```json
{ "type": "error", "message": "Mistral API rate limit exceeded" }
```

#### `stopped` — Acknowledgement of stop

```json
{ "type": "stopped" }
```

---

## 2. `POST /api/analyze` — One-Shot (Fallback)

For testing or clients that can't use WebSocket. No buffering — processes the transcript immediately.

### Request

```
POST /api/analyze
Content-Type: application/json
```

```json
{
  "transcript": "I think Trump is going to win the next election, the polls are looking really strong for him right now and the betting markets are shifting heavily in his favor"
}
```

- `transcript` must be a string, minimum 100 characters

### Response (200 OK)

```json
{
  "analysis": {
    "detected": true,
    "queries": ["Trump 2028 election", "US presidential election", "Trump polls"],
    "tag": "politics",
    "reason": "Discussion about presidential election odds shifting"
  },
  "markets": [
    {
      "id": "...",
      "slug": "...",
      "title": "...",
      "question": "...",
      "volume": "...",
      "markets": [...],
      "sparkline": [...],
      "image": "..."
    }
  ]
}
```

### Error Responses

| Status | Body | Cause |
|---|---|---|
| `400` | `{ "error": "transcript field is required and must be a string" }` | Missing or wrong type |
| `400` | `{ "error": "transcript too short", "detail": "Received 5 chars, minimum is 100" }` | Too short |
| `500` | `{ "error": "Pipeline failed", "detail": "..." }` | Mistral or Polymarket error |

---

## 3. `GET /health`

```
GET /health
```

Response: `{ "status": "ok" }`

---

## Quick Start

```bash
cd polymarket
cp .env.example .env        # add your MISTRAL_API_KEY
npm install
npm start                   # or: npm run dev (--watch mode)
```

Server prints:
```
✅  Polymarket API running
   REST  → http://localhost:3001/api/analyze
   WS    → ws://localhost:3001/api/stream
   Health → http://localhost:3001/health
```

---

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `MISTRAL_API_KEY` | ✅ | — | Get one at https://console.mistral.ai |
| `PORT` | No | `3001` | Server port |

---

## File Structure

```
polymarket/
├── polymarket.md                 ← this doc
├── package.json
├── .env.example
└── src/
    ├── index.js                  — Express + WS server entrypoint
    ├── routes/
    │   └── analyze.js            — POST /api/analyze
    ├── ws/
    │   └── stream.js             — WS /api/stream handler
    ├── services/
    │   ├── buffer.js             — TranscriptBuffer (per-session)
    │   ├── mistral.js            — Mistral structured output
    │   └── polymarket.js         — gamma-api search + sparklines
    └── utils/
        └── cleanText.js          — LLM output sanitiser
```

---

## For Upstream: raybans (Mike)

Your job is to capture live audio from Meta glasses, run STT, and stream the text to this API. **No buffering needed on your side** — just send chunks as they come.

### Connect & Stream

```javascript
const ws = new WebSocket('ws://localhost:3001/api/stream')

// Send every time your STT emits text (sentence, partial phrase, anything)
function onSttResult(text) {
  ws.send(JSON.stringify({ type: 'transcript', text }))
}

// When user stops capturing or disconnects glasses
function onStop() {
  ws.send(JSON.stringify({ type: 'stop' }))
  // or just: ws.close()
}
```

### What You'll Receive Back

```javascript
ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  // msg.type is one of: 'buffering' | 'analysis' | 'markets' | 'error' | 'stopped'
  // See "Server → Client Messages" section above for full schemas
}
```

### Full Example (Simulating a Live Match)

```javascript
const WebSocket = require('ws')
const ws = new WebSocket('ws://localhost:3001/api/stream')

ws.on('open', () => {
  const chunks = [
    "Welcome to the Champions League final between",
    "Real Madrid and Barcelona. Mbappe has the ball",
    "and he scores! 1-0 to Real Madrid in the 15th minute,",
    "this is incredible the odds must be shifting massively",
    "for the match outcome and the top scorer markets.",
    "Barcelona need to respond quickly or Real Madrid",
    "will run away with this trophy. The crowd is going",
    "absolutely wild here at Wembley Stadium tonight.",
    "Commentators saying this could be one of the greatest",
    "finals in Champions League history."
  ]
  let i = 0
  const iv = setInterval(() => {
    if (i >= chunks.length) { clearInterval(iv); return }
    ws.send(JSON.stringify({ type: 'transcript', text: chunks[i++] }))
  }, 500)
})

ws.on('message', (data) => console.log(JSON.parse(data)))
```

### Key Points

- Send raw STT text — no cleaning needed
- Small/frequent chunks are fine
- Each WS connection = isolated session (multiple users OK)
- Server buffers until 600 chars, then fires analysis

---

## For Downstream: webApp (Jerry)

Your job is to consume the market data this API produces and display it on the dashboard.

### Option A: WebSocket (Recommended for Live Dashboard)

Connect to the same WS endpoint and listen for pushes:

```javascript
const ws = new WebSocket('ws://localhost:3001/api/stream')

ws.onmessage = (event) => {
  const msg = JSON.parse(event.data)
  switch (msg.type) {
    case 'buffering':
      updateProgress(msg.chars, msg.threshold)  // e.g. progress bar
      break
    case 'analysis':
      displayAnalysis(msg.data)  // { detected, queries, tag, reason }
      break
    case 'markets':
      renderMarketCards(msg.data.markets)  // array of Market objects
      break
    case 'error':
      showError(msg.message)
      break
  }
}
```

### Option B: REST (For Testing)

```javascript
const res = await fetch('http://localhost:3001/api/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ transcript: '...' })  // min 100 chars
})
const { analysis, markets } = await res.json()
```

### Parsing Market Data

```javascript
// Get Yes/No price from a market
function getYesPrice(market) {
  const sub = market.markets[0]
  if (!sub) return null
  const prices = JSON.parse(sub.outcomePrices)  // '["0.65", "0.35"]'
  return parseFloat(prices[0])  // 0.65 = 65% chance
}

// Build Polymarket link
function getUrl(market) {
  return `https://polymarket.com/event/${market.slug}`
}
```

### Message Timeline (What to Expect)

```
buffering → buffering → ... → analysis → markets → buffering → ...
```

### Suggested UI Components

| Component | Data Source |
|---|---|
| Progress bar | `buffering.chars / buffering.threshold` |
| Topic badge | `analysis.data.tag` (color-coded) |
| Summary line | `analysis.data.reason` |
| Market cards | `markets.data.markets[]` — title, price, sparkline, volume |
| Link button | `market.slug` → `polymarket.com/event/{slug}` |
| Thumbnail | `market.image` |

### Health Check (Before Showing Dashboard)

```javascript
const { status } = await (await fetch('http://localhost:3001/health')).json()
// status === 'ok' → show dashboard
```
