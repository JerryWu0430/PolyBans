// Analysis types - Phase 2
export interface AnalysisResult {
  sentiment: "bullish" | "bearish" | "neutral";
  confidence: number;
  summary: string;
  entities: ExtractedEntity[];
  suggestedQueries: string[];
}

export interface AnalysisContext {
  transcript: string;
  recentMarkets?: string[];
  userIntent?: string;
}

export interface ExtractedEntity {
  name: string;
  type: "team" | "candidate" | "event" | "company" | "other";
  relevance: number;
}

export interface MistralResponse {
  content: string;
  done: boolean;
}
