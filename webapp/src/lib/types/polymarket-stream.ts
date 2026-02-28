/**
 * Types for WebSocket streams from polymarket:3001 and relay:8420
 */

// Connection state for all WS clients
export type ConnectionState = "connecting" | "connected" | "disconnected" | "error";

// --- Polymarket Service Messages (port 3001) ---

export interface PolymarketAnalysis {
  detected: boolean;
  queries: string[];
  tag: "politics" | "crypto" | "sports" | "business" | "science" | "pop-culture" | null;
  reason: string;
}

// Sub-market within a multi-outcome event
export interface SubMarket {
  question: string;
  groupItemTitle: string;  // Short label (e.g., "Thom Tillis")
  yesPrice: number;
  noPrice: number;
  volume: string;
  clobTokenId: string;     // Yes token for price history
  sparkline?: number[];
}

export interface PolymarketMarket {
  id: string;
  slug: string;
  title: string;
  question: string;
  volume: string;
  subMarkets: SubMarket[];  // Structured multi-outcome markets
  markets: OutcomeData[];   // Keep for backward compat
  sparkline: number[];
  image: string | null;
}

export interface OutcomeData {
  outcome: string;
  price: number;
  volume?: string;
  clobTokenId?: string;
}

export interface MarketsPayload {
  reason: string;
  queries: string[];
  markets: PolymarketMarket[];
}

export type PolymarketMessage =
  | { type: "buffering"; chars: number; threshold: number }
  | { type: "analysis"; data: PolymarketAnalysis }
  | { type: "markets"; data: MarketsPayload }
  | { type: "error"; message: string }
  | { type: "stopped" };

// --- Relay Server Messages (port 8420) ---

export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  source: string;
  confidence?: number;
  language?: string;
}

export interface FrameData {
  id: string;
  timestamp: number;
  base64: string;
  width: number;
  height: number;
}

export type RelayMessage =
  | { type: "transcript"; id: string; text: string; timestamp: number; source: string; confidence?: number; language?: string }
  | { type: "frame"; id: string; timestamp: number; base64: string; width: number; height: number }
  | { type: "history"; entries: TranscriptSegment[] }
  | { type: "error"; message: string };
