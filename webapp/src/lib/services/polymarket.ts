import type {
  Market,
  Odds,
  PriceUpdate,
  MarketSearchParams,
} from "@/lib/types";

const GAMMA_API_URL = "https://gamma-api.polymarket.com";
const CLOB_API_URL = "https://clob.polymarket.com";
const CLOB_WS_URL = "wss://ws-subscriptions-clob.polymarket.com/ws/market";

export async function getMarkets(
  params?: MarketSearchParams
): Promise<Market[]> {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", String(params.limit));
  if (params?.offset) searchParams.set("offset", String(params.offset));
  if (params?.category) searchParams.set("tag", params.category);

  const url = `${GAMMA_API_URL}/markets?${searchParams.toString()}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch markets: ${res.status}`);
  }

  const data = await res.json();
  return data.map(mapGammaMarket);
}

export async function getMarket(id: string): Promise<Market> {
  const res = await fetch(`${GAMMA_API_URL}/markets/${id}`);

  if (!res.ok) {
    throw new Error(`Failed to fetch market ${id}: ${res.status}`);
  }

  const data = await res.json();
  return mapGammaMarket(data);
}

export async function searchMarkets(query: string): Promise<Market[]> {
  const res = await fetch(
    `${GAMMA_API_URL}/markets?_q=${encodeURIComponent(query)}`
  );

  if (!res.ok) {
    throw new Error(`Failed to search markets: ${res.status}`);
  }

  const data = await res.json();
  return data.map(mapGammaMarket);
}

export function subscribeToOdds(
  marketIds: string[],
  onUpdate: (update: PriceUpdate) => void
): () => void {
  const ws = new WebSocket(CLOB_WS_URL);
  let isActive = true;

  ws.onopen = () => {
    if (!isActive) return;
    // Subscribe to price channels for each market
    marketIds.forEach((id) => {
      ws.send(
        JSON.stringify({
          type: "subscribe",
          channel: "price",
          market: id,
        })
      );
    });
  };

  ws.onmessage = (event) => {
    if (!isActive) return;
    try {
      const data = JSON.parse(event.data);
      if (data.type === "price_update") {
        onUpdate({
          marketId: data.market,
          tokenId: data.token_id,
          price: parseFloat(data.price),
          timestamp: Date.now(),
        });
      }
    } catch {
      // Ignore parse errors
    }
  };

  ws.onerror = (err) => {
    console.error("WebSocket error:", err);
  };

  // Return unsubscribe function
  return () => {
    isActive = false;
    if (ws.readyState === WebSocket.OPEN) {
      ws.close();
    }
  };
}

export function getOddsFromMarket(market: Market): Odds {
  const prices = market.outcomePrices?.map((p) => parseFloat(p)) ?? [];
  return {
    marketId: market.id,
    outcomes: market.outcomes.map((outcome, i) => ({
      outcome,
      price: prices[i] ?? 0,
    })),
    timestamp: Date.now(),
  };
}

// Map Gamma API response to our Market type
function mapGammaMarket(data: Record<string, unknown>): Market {
  return {
    id: String(data.id ?? ""),
    question: String(data.question ?? ""),
    description: data.description ? String(data.description) : undefined,
    outcomes: Array.isArray(data.outcomes)
      ? data.outcomes.map(String)
      : ["Yes", "No"],
    outcomePrices: Array.isArray(data.outcomePrices)
      ? data.outcomePrices.map(String)
      : undefined,
    volume: data.volume ? String(data.volume) : undefined,
    liquidity: data.liquidity ? String(data.liquidity) : undefined,
    endDate: data.endDate ? String(data.endDate) : undefined,
    category: data.category ? String(data.category) : undefined,
    slug: data.slug ? String(data.slug) : undefined,
    active: data.active !== false,
  };
}

/**
 * Fetch price history (sparkline) for a CLOB token.
 * Returns array of prices over time.
 */
export async function getSparkline(clobTokenId: string): Promise<number[]> {
  if (!clobTokenId) return [];
  try {
    const res = await fetch(
      `${CLOB_API_URL}/prices-history?interval=max&market=${clobTokenId}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.history && Array.isArray(data.history)) {
      return data.history.map((h: { p: number }) => h.p);
    }
    return [];
  } catch {
    return [];
  }
}
