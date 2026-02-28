// Polymarket types - Phase 2
export interface Market {
  id: string;
  question: string;
  description?: string;
  outcomes: string[];
  outcomePrices?: string[];
  volume?: string;
  liquidity?: string;
  endDate?: string;
  category?: string;
  slug?: string;
  active?: boolean;
}

export interface Odds {
  marketId: string;
  outcomes: OutcomeOdds[];
  timestamp: number;
}

export interface OutcomeOdds {
  outcome: string;
  price: number;
  change24h?: number;
}

export interface OrderBook {
  bids: Order[];
  asks: Order[];
}

export interface Order {
  price: number;
  size: number;
}

export interface PriceUpdate {
  marketId: string;
  tokenId: string;
  price: number;
  timestamp: number;
}

export interface MarketSearchParams {
  limit?: number;
  offset?: number;
  category?: string;
}
