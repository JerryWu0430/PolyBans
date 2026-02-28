// Types for polymarket:3001 WS stream

export type PolymarketTag =
  | "politics"
  | "crypto"
  | "sports"
  | "business"
  | "science"
  | "pop-culture"
  | null;

export interface PolymarketAnalysis {
  detected: boolean;
  queries: string[];
  tag: PolymarketTag;
  reason: string;
}

export interface OutcomeData {
  outcome: string;
  outcomePrices?: string;
  clobTokenIds?: string | string[];
  groupItemTitle?: string;
}

export interface PolymarketMarket {
  id: string;
  slug: string;
  title: string;
  question: string;
  volume: string;
  markets: OutcomeData[];
  sparkline: number[];
  image: string | null;
}

export interface MarketsPayload {
  reason: string;
  queries: string[];
  markets: PolymarketMarket[];
}

// WS message types from polymarket:3001
export type PolymarketMessage =
  | { type: "buffering"; chars: number; threshold: number }
  | { type: "analysis"; data: PolymarketAnalysis }
  | { type: "markets"; data: MarketsPayload }
  | { type: "error"; message: string }
  | { type: "stopped" };

// Relay server message types (ws://localhost:8420)
export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  source?: string;
  confidence?: number;
  language?: string;
}

export type RelayMessage =
  | { type: "transcript"; id: string; text: string; timestamp: number; source?: string; confidence?: number; language?: string }
  | { type: "history"; entries: TranscriptSegment[] }
  | { type: "frame"; id: string; timestamp: number; sizeBytes: number; data: string };

// Connection state
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";
