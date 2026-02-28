// Polymarket types - Phase 2
export interface Market {
  id: string;
  question: string;
  outcomes: string[];
}

export interface OrderBook {
  bids: Order[];
  asks: Order[];
}

export interface Order {
  price: number;
  size: number;
}
