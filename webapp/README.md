# PolyBans WebApp

Polymarket arbitrage dashboard with real-time analysis from live streams (Ray-Bans Meta glasses or YouTube/Twitch/X).

## Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment
```bash
cp .env.local.example .env.local
# or just edit .env.local directly
```

Add your Mistral API key to `.env.local`:
```
MISTRAL_API_KEY=your_key_here
```

**Get Mistral API Key:**
1. Go to https://console.mistral.ai/
2. Sign up / Log in
3. Create API key
4. Paste into `.env.local`

### 3. Run dev server
```bash
npm run dev
```

Open http://localhost:3000

## Modes

- **Ray-Bans Mode** (`/raybans`) - Connect Meta glasses via OpenGlass
- **Web Live Mode** (`/weblive`) - Analyze YouTube/Twitch/X streams
- **Arbitrage Dashboard** (`/arbitrage`) - View opportunities + sentiment

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- shadcn/ui + Tailwind
- Zustand (state)
- WebSockets (real-time)
- Mistral AI (analysis)

## API Endpoints

| Route | Method | Purpose |
|-------|--------|---------|
| `/api/polymarket/markets` | GET | Fetch trending markets |
| `/api/polymarket/odds` | GET | Get odds for market |
| `/api/analysis/mistral` | POST | Analyze transcript |
| `/api/social/reddit` | GET | Reddit sentiment |
| `/api/raybans/webhook` | POST | OpenGlass data receiver |

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/      # Dashboard routes
│   └── api/              # API routes
├── components/
│   ├── ui/               # shadcn components
│   ├── layout/           # Sidebar, Header
│   ├── dashboard/        # ArbitrageCard, etc
│   ├── raybans/          # Ray-Bans mode components
│   └── weblive/          # Web Live mode components
└── lib/
    ├── services/         # API clients
    ├── stores/           # Zustand stores
    ├── hooks/            # Custom hooks
    └── types/            # TypeScript types
```
