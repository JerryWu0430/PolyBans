import type { Odds, Market } from "../types/polymarket";
import type { AnalysisResult } from "../types/analysis";
import type { TranscriptChunk } from "../types/stream";

export interface ArbitrageOpp {
  id: string;
  marketA: Market;
  marketB: Market;
  spread: number;
  confidence: number;
  timestamp: number;
}

export type WSMessage =
  | { type: "ODDS_UPDATE"; payload: Odds }
  | { type: "TRANSCRIPT_CHUNK"; payload: TranscriptChunk }
  | { type: "ANALYSIS_RESULT"; payload: AnalysisResult }
  | { type: "ARBITRAGE_OPPORTUNITY"; payload: ArbitrageOpp }
  | { type: "CONNECTION_STATUS"; payload: "connected" | "disconnected" };

export type WSMessageType = WSMessage["type"];

export type WSPayload<T extends WSMessageType> = Extract<
  WSMessage,
  { type: T }
>["payload"];
