/**
 * polymarketSearch.ts — Polymarket search API client.
 *
 * Provides market search via Gamma API and sparkline data from CLOB API.
 */

const GAMMA_API = "https://gamma-api.polymarket.com";
const CLOB_API = "https://clob.polymarket.com";

// Raw API response structure (from Gamma API)
interface GammaMarket {
  outcomes?: string; // JSON array string like "[\"Yes\", \"No\"]"
  outcomePrices?: string; // JSON array string like "[\"0.45\", \"0.55\"]"
  clobTokenIds?: string; // JSON array string of token IDs
  volume?: string;
  question?: string; // sub-market question, e.g. "Will Real Madrid win LaLiga?"
}

// Transformed structure for UI
export interface MarketOutcome {
  outcome: string;
  price: number;
  volume?: string;
  clobTokenId?: string;
}

export interface SearchMarketResult {
  id: string;
  slug: string;
  title: string;
  question: string;
  volume: string;
  markets: MarketOutcome[];
  sparkline: number[];
  image: string | null;
}

/**
 * Parse JSON array string safely
 */
function parseJsonArray(str: string | undefined): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Transform raw API market data to UI-friendly format.
 *
 * Multi-market events (e.g. "Which team wins?") have one sub-market per option.
 * For these, extract the Yes (index 0) price per sub-market and use the
 * market question as the outcome label.
 *
 * Single binary markets (e.g. "Will X happen?") keep the standard Yes/No pair.
 */
function transformMarkets(rawMarkets: GammaMarket[] | undefined): MarketOutcome[] {
  if (!rawMarkets || !Array.isArray(rawMarkets) || rawMarkets.length === 0) return [];

  // Multi-market event: each sub-market = one outcome option
  if (rawMarkets.length > 1) {
    return rawMarkets.slice(0, 6).map((market) => {
      const prices = parseJsonArray(market.outcomePrices);
      const tokenIds = parseJsonArray(market.clobTokenIds);
      // index 0 is always the "Yes" / long price
      const yesPrice = parseFloat(prices[0]) || 0;

      // Shorten the question to just the entity name:
      // "Will Real Madrid win LaLiga?" → "Real Madrid"
      let label = market.question ?? "Unknown";
      label = label.replace(/^Will\s+/i, "").replace(/\s*(win|qualify|advance|be|become|make).*$/i, "").trim();
      if (!label) label = market.question ?? "Unknown";

      console.log(`[polymarket] Outcome: "${label}" price=${yesPrice}`);

      return {
        outcome: label,
        price: yesPrice,
        volume: market.volume,
        clobTokenId: tokenIds[0],
      };
    });
  }

  // Single binary market: keep Yes / No
  const market = rawMarkets[0];
  const outcomes = parseJsonArray(market.outcomes);
  const prices = parseJsonArray(market.outcomePrices);
  const tokenIds = parseJsonArray(market.clobTokenIds);

  return outcomes.slice(0, 2).map((outcome, i) => {
    const price = parseFloat(prices[i]) || 0;
    console.log(`[polymarket] Outcome: "${outcome}" price=${price}`);
    return {
      outcome,
      price,
      volume: market.volume,
      clobTokenId: tokenIds[i],
    };
  });
}

/**
 * Fetch price history (sparkline) for a CLOB token.
 */
export async function getSparkline(clobTokenId: string): Promise<number[]> {
  if (!clobTokenId) return [];
  try {
    const res = await fetch(
      `${CLOB_API}/prices-history?interval=max&market=${clobTokenId}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data?.history) {
      return data.history.map((h: { p: number }) => h.p);
    }
    return [];
  } catch {
    return [];
  }
}

/**
 * Search Polymarket for active events matching a query.
 * Returns up to 3 enriched market objects per query.
 */
export async function searchActiveEvents(
  query: string,
  tag?: string | null
): Promise<SearchMarketResult[]> {
  try {
    let url = `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&events_status=active&limit_per_type=20`;
    if (tag && tag.toLowerCase() !== "null") {
      url += `&events_tag=${encodeURIComponent(tag.toLowerCase())}`;
    }

    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();

    if (!data?.events?.length) return [];

    const topEvents = data.events.slice(0, 3);
    const results: SearchMarketResult[] = [];

    for (const event of topEvents) {
      // Transform raw API markets to UI format
      const markets = transformMarkets(event.markets);

      // Fetch sparkline from first outcome's token
      let sparkline: number[] = [];
      const firstTokenId = markets[0]?.clobTokenId;
      if (firstTokenId) {
        sparkline = await getSparkline(firstTokenId);
      }

      results.push({
        id: event.id,
        slug: event.slug,
        title: event.title,
        question: event.question || event.title,
        volume: event.volume,
        markets,
        sparkline,
        image: event.image ?? null,
      });
    }

    return results;
  } catch (err) {
    console.error("[polymarketSearch] searchMarkets error:", (err as Error).message);
    return [];
  }
}

/**
 * Run parallel searches for all queries, deduplicate by event ID,
 * filter zero-volume markets, sort by volume desc, cap at 4.
 */
export async function fetchMarkets(
  queries: string[],
  tag?: string | null
): Promise<SearchMarketResult[]> {
  const allResults = await Promise.all(
    queries.map((q) => searchActiveEvents(q, tag))
  );

  const seen = new Set<string>();
  const markets: SearchMarketResult[] = [];

  for (const batch of allResults) {
    for (const m of batch) {
      if (!seen.has(m.id) && Number(m.volume) > 0) {
        seen.add(m.id);
        markets.push(m);
      }
    }
  }

  markets.sort((a, b) => (Number(b.volume) || 0) - (Number(a.volume) || 0));
  return markets.slice(0, 4);
}
