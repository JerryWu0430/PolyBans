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
  question?: string;
  groupItemTitle?: string; // Short label for multi-outcome markets
  slug?: string; // Market slug for embeds
}

// Transformed structure for UI
export interface MarketOutcome {
  outcome: string;
  price: number;
  volume?: string;
  clobTokenId?: string;
}

// Sub-market for multi-outcome events
export interface SubMarket {
  question: string;
  groupItemTitle: string;
  yesPrice: number;
  noPrice: number;
  volume: string;
  clobTokenId: string;
  slug: string; // For official embed iframe
  sparkline?: number[];
}

export interface SearchMarketResult {
  id: string;
  slug: string;
  title: string;
  question: string;
  volume: string;
  subMarkets: SubMarket[];  // Structured multi-outcome
  markets: MarketOutcome[]; // Keep for compat
  sparkline: number[];
  image: string | null;
}

/**
 * Parse JSON array string safely
 */
export function parseJsonArray(str: string | undefined): string[] {
  if (!str) return [];
  try {
    const parsed = JSON.parse(str);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Transform raw API market data to UI-friendly format (backward compat).
 */
export function transformMarkets(rawMarkets: GammaMarket[] | undefined): MarketOutcome[] {
  if (!rawMarkets || !Array.isArray(rawMarkets)) return [];

  const results: MarketOutcome[] = [];

  for (const market of rawMarkets.slice(0, 5)) {
    const outcomes = parseJsonArray(market.outcomes);
    const prices = parseJsonArray(market.outcomePrices);
    const tokenIds = parseJsonArray(market.clobTokenIds);

    for (let i = 0; i < outcomes.length && i < 4; i++) {
      results.push({
        outcome: outcomes[i] || "Unknown",
        price: parseFloat(prices[i]) || 0,
        volume: market.volume,
        clobTokenId: tokenIds[i],
      });
    }
  }

  return results;
}

/**
 * Transform raw markets to SubMarket[] for multi-outcome events.
 * Filters out placeholder markets (null prices, 0 volume).
 */
export function transformToSubMarkets(rawMarkets: GammaMarket[] | undefined): SubMarket[] {
  if (!rawMarkets || !Array.isArray(rawMarkets)) return [];

  return rawMarkets
    .filter((m) => {
      // Filter out placeholders: null prices or 0 volume
      const vol = parseFloat(m.volume || "0");
      const hasPrices = m.outcomePrices && m.outcomePrices !== "null";
      return hasPrices && vol > 0;
    })
    .slice(0, 10)
    .map((m) => {
      const prices = parseJsonArray(m.outcomePrices);
      const tokens = parseJsonArray(m.clobTokenIds);
      const label = m.groupItemTitle || m.question?.split(" ").slice(-2).join(" ") || "Market";

      return {
        question: m.question || "",
        groupItemTitle: label,
        yesPrice: parseFloat(prices[0]) || 0,
        noPrice: parseFloat(prices[1]) || 0,
        volume: m.volume || "0",
        clobTokenId: tokens[0] || "",
        slug: m.slug || "",
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
    let url = `${GAMMA_API}/public-search?q=${encodeURIComponent(query)}&events_status=active&limit_per_type=20&order=volume&ascending=false`;
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
      // Transform to both formats
      const markets = transformMarkets(event.markets);
      const subMarkets = transformToSubMarkets(event.markets);

      // Fetch sparklines for top 5 sub-markets in parallel
      const sparklinePromises = subMarkets.slice(0, 5).map(async (sm, i) => {
        if (sm.clobTokenId) {
          const sparkline = await getSparkline(sm.clobTokenId);
          console.log(`[polymarket] Sparkline for ${sm.groupItemTitle}: ${sparkline.length} points`);
          subMarkets[i].sparkline = sparkline;
        }
      });
      await Promise.all(sparklinePromises);
      console.log(`[polymarket] Event "${event.title}" has ${subMarkets.length} subMarkets`);

      // Event-level sparkline from first market
      const sparkline = subMarkets[0]?.sparkline || [];

      results.push({
        id: event.id,
        slug: event.slug,
        title: event.title,
        question: event.question || event.title,
        volume: event.volume,
        subMarkets,
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
  return markets.slice(0, 5);
}
