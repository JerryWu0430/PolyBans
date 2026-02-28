# PolyBans UI Refactor + Polymarket Integration Plan

> **Issues created in vibe-kanban (PolyBans project)**

## Summary
1. Port `/polymarket` Node.js services → Next.js API routes
2. Redesign Ray-Bans page: video main, transcript overlay, markets sidebar
3. Enable dark mode (CSS exists, just needs `dark` class on html)
4. Add market order modal with CLOB API
5. Restore Mistral AI analysis

---

## Phase 1: Dark Mode (Quick Win)

### Modify: `webapp/src/app/layout.tsx`
- Add `className="dark"` to `<html>` tag (hardcode for now)
- Dark theme CSS variables already defined in globals.css

---

## Phase 2: Port Services to Next.js

### Create: `webapp/src/lib/services/mistral.ts`
Port from `polymarket/src/services/mistral.js`:
- Mistral Large client with JSON mode
- `analyze(transcript)` → `{ detected, queries, tag, reason }`

### Create: `webapp/src/lib/services/polymarketSearch.ts`
Port from `polymarket/src/services/polymarket.js`:
- `searchMarkets(query, tag)` - Gamma API search
- `fetchMarkets(queries, tag)` - parallel search, dedupe, sort by volume
- `getSparkline(clobTokenId)` - CLOB API price history
- Returns full market data: id, slug, title, question, volume, markets[], sparkline, image

### Create: `webapp/src/lib/services/transcriptBuffer.ts`
Port from `polymarket/src/services/buffer.js`:
- TranscriptBuffer class (600 char threshold, 200 char overlap)

### Create: `webapp/src/app/api/analysis/route.ts`
POST endpoint:
- Input: `{ transcript: string }`
- Calls mistral.analyze() + fetchMarkets()
- Returns: `{ analysis, markets }`

---

## Phase 3: Redesign UI Layout

### New Layout Structure:
```
+--------------------------------------------------+
| Header (status bar - exists)                      |
+--------------------------------------------------+
|                                |                  |
|     VideoFeed (main)           | Markets Sidebar  |
|     +------------------+       |                  |
|     | Transcript       |       | [Market Card 1]  |
|     | Overlay          |       | [Market Card 2]  |
|     | (expandable)     |       | [Market Card 3]  |
|     +------------------+       |                  |
|     | Control Bar      |       |                  |
+--------------------------------------------------+
```

### Create: `webapp/src/components/raybans/TranscriptOverlay.tsx`
- Absolute positioned over video (bottom area)
- **Default: Collapsed** - shows latest 1-2 transcript lines
- Click/tap to expand full transcript view
- Expand indicator for good UX (chevron + "View all" hint)
- Semi-transparent backdrop (bg-card/80 backdrop-blur)
- Buffer progress bar in collapsed state

### Create: `webapp/src/components/raybans/MarketsSidebar.tsx`
- Fixed-width right sidebar (w-80 or w-96)
- Vertical scrollable market cards
- Each card clickable → opens order modal
- Shows: image, question, volume, outcomes, sparkline

### Create: `webapp/src/components/raybans/VideoControlBar.tsx`
- Mock/Live toggle (larger, more visible)
- Start/Stop button
- Connection status
- Buffer progress

### Modify: `webapp/src/app/(dashboard)/raybans/page.tsx`
- Import & use VideoFeed component (currently unused)
- Replace inline transcript panel with TranscriptOverlay
- Add MarketsSidebar on right
- Restructure layout: video (flex-1) | sidebar (fixed width)

---

## Phase 4: Market Order Modal

### Create: `webapp/src/components/raybans/MarketOrderModal.tsx`
- Dialog with full market details (image, question, description)
- Current prices for all outcomes
- Sparkline chart (larger view)
- Volume & liquidity info
- **Primary CTA: "Trade on Polymarket" link** (opens in new tab)
- Mistral AI analysis summary for this market

### Modify: `webapp/src/lib/stores/arbitrageStore.ts`
Add:
- `selectedMarketForOrder: PolymarketMarket | null`
- `isOrderModalOpen: boolean`
- `openOrderModal(market)`, `closeOrderModal()`

---

## Phase 5: Wire Up New Analysis Pipeline

### Create: `webapp/src/lib/hooks/useAnalysisPipeline.ts`
Client-side orchestration:
- Maintains TranscriptBuffer in state
- When buffer ready → POST /api/analysis
- Updates arbitrageStore with results
- Replaces current usePolymarketStream hook

### Modify: `webapp/src/app/(dashboard)/raybans/page.tsx`
- Replace usePolymarketStream with useAnalysisPipeline
- Keep useRelayStream for live Meta glasses data

---

## Files Summary

### CREATE:
1. `webapp/src/lib/services/mistral.ts`
2. `webapp/src/lib/services/polymarketSearch.ts`
3. `webapp/src/lib/services/transcriptBuffer.ts`
4. `webapp/src/app/api/analysis/route.ts`
5. `webapp/src/components/raybans/TranscriptOverlay.tsx`
6. `webapp/src/components/raybans/MarketsSidebar.tsx`
7. `webapp/src/components/raybans/VideoControlBar.tsx`
8. `webapp/src/components/raybans/MarketOrderModal.tsx`
9. `webapp/src/lib/hooks/useAnalysisPipeline.ts`

### MODIFY:
1. `webapp/src/app/layout.tsx` - add dark class
2. `webapp/src/app/(dashboard)/raybans/page.tsx` - new layout
3. `webapp/src/lib/stores/arbitrageStore.ts` - modal state
4. `webapp/src/lib/services/index.ts` - export new services

### DELETE (after verification):
- `polymarket/` folder (optional, keep as reference)

---

## Verification Plan
1. Run `pnpm dev` in webapp
2. Navigate to /raybans
3. Verify dark mode active
4. Click MOCK → START, verify:
   - Video feed shows (with fallback pattern if no frame)
   - Transcript overlay appears over video
   - Markets appear in sidebar after analysis
5. Click market card → verify modal opens with order book
6. Toggle LIVE mode → verify relay stream connects

---

## Decisions Made
- **Overlay**: Collapsed by default, shows 1-2 lines, expands on click
- **Order modal**: Link to Polymarket only (no wallet integration)
- **Cleanup**: Keep /polymarket folder as backup
