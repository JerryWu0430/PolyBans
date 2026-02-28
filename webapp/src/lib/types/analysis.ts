// Analysis types - Phase 2
export interface AnalysisResult {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  summary: string;
}

export interface MistralResponse {
  content: string;
  done: boolean;
}
