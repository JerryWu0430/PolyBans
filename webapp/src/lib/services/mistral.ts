/**
 * mistral.ts — Mistral AI structured output service.
 *
 * Uses Mistral's JSON mode to extract prediction-market signals
 * from live transcript chunks.
 */

import { Mistral } from "@mistralai/mistralai";

const client = new Mistral({ apiKey: process.env.MISTRAL_API_KEY });

const MODEL = "mistral-large-latest";

export type MarketTag =
  | "politics"
  | "crypto"
  | "sports"
  | "business"
  | "science"
  | "pop-culture";

export interface AnalysisSignal {
  detected: boolean;
  queries: string[];
  tag: MarketTag | null;
  reason: string;
  // Strategic analysis (populated by analyzeStrategy)
  strategy?: StrategyAnalysis;
}

export interface StrategyAnalysis {
  summary: string;           // 2-3 sentence strategic overview
  edge: string | null;       // Detected edge from transcript context
  undervalued: string | null; // Which outcome seems undervalued and why
  sentiment: "bullish" | "bearish" | "neutral" | "mixed";
  confidence: "low" | "medium" | "high";
  risk: string;              // Key risk to watch
}

// Schema for initial detection
const DETECTION_SCHEMA = {
  type: "object",
  properties: {
    detected: {
      type: "boolean",
      description:
        "Whether a betting/prediction market topic is being discussed",
    },
    queries: {
      type: "array",
      items: { type: "string" },
      description:
        "1-3 distinct keyword phrases optimised for Polymarket search, covering different angles of the topic",
    },
    tag: {
      type: "string",
      enum: ["politics", "crypto", "sports", "business", "science", "pop-culture"],
      description: "Category of the detected market",
      nullable: true,
    },
    reason: {
      type: "string",
      description:
        "Concise summary (max 20 words) of what is being discussed and why it could be a bet",
    },
  },
  required: ["detected", "queries", "reason"],
} as const;

// Schema for strategic analysis
const STRATEGY_SCHEMA = {
  type: "object",
  properties: {
    summary: {
      type: "string",
      description: "2-3 sentence strategic analysis combining transcript context with market odds",
    },
    edge: {
      type: "string",
      description: "Information edge detected from transcript that market may not have priced in. Null if none.",
      nullable: true,
    },
    undervalued: {
      type: "string",
      description: "Which specific outcome appears undervalued based on transcript context vs current odds, with brief reasoning. Null if none clear.",
      nullable: true,
    },
    sentiment: {
      type: "string",
      enum: ["bullish", "bearish", "neutral", "mixed"],
      description: "Overall sentiment from transcript toward the leading outcome",
    },
    confidence: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Confidence level in the strategic assessment",
    },
    risk: {
      type: "string",
      description: "Key risk or uncertainty to monitor (max 15 words)",
    },
  },
  required: ["summary", "sentiment", "confidence", "risk"],
} as const;

// Clean LLM output artifacts (matches tags like <grok:render>...</grok:render>)
const RENDER_TAG_RE = /<[a-z]+:[a-z]+[^>]*>[\s\S]*?<\/[a-z]+:[a-z]+>/g;

function cleanText(text: string): string {
  if (!text) return "";
  return text.replace(RENDER_TAG_RE, "").trim();
}

/**
 * Analyse a transcript chunk and return a structured prediction-market signal.
 */
export async function analyze(transcript: string): Promise<AnalysisSignal> {
  const now = new Date().toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const response = await client.chat.complete({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are an expert at identifying topics that could have active prediction markets on Polymarket.
The current date is ${now}. Treat any mentions of future events relative to this date.
You are analysing a live transcript from someone wearing Meta smart glasses at a real-world event (sports game, conference, rally, etc.).
Identify if ANY subject being discussed could have a prediction/betting market. "detected" should only be true if a clear market is likely to exist.
When detected is true, generate 2-3 diverse search query variations to maximise Polymarket search coverage.
Always respond in valid JSON matching the provided schema.`,
      },
      {
        role: "user",
        content: `Analyse this live transcript and identify prediction market opportunities:\n\n"${transcript}"`,
      },
    ],
    responseFormat: {
      type: "json_schema",
      jsonSchema: {
        name: "polymarket_signal",
        strict: true,
        schemaDefinition: DETECTION_SCHEMA,
      },
    },
    temperature: 0.2,
  });

  const raw = response.choices?.[0]?.message?.content;
  if (!raw || typeof raw !== "string") {
    return { detected: false, queries: [], tag: null, reason: "" };
  }

  const result = JSON.parse(raw) as AnalysisSignal;

  // Sanitise strings
  if (result.reason) result.reason = cleanText(result.reason);
  if (result.queries) result.queries = result.queries.map(cleanText);
  if (!result.tag) result.tag = null;

  return result;
}

export interface MarketDataForAnalysis {
  title: string;
  outcomes: Array<{
    name: string;
    probability: number;
    volume: number;
  }>;
}

/**
 * Strategic analysis combining transcript context with market data.
 * Call after markets are fetched to get edge/undervalued insights.
 */
export async function analyzeStrategy(
  transcript: string,
  market: MarketDataForAnalysis
): Promise<StrategyAnalysis | null> {
  try {
    const now = new Date().toLocaleDateString("en-US", {
      month: "long",
      year: "numeric",
    });

    const marketSummary = market.outcomes
      .slice(0, 8)
      .map((o) => `• ${o.name}: ${(o.probability * 100).toFixed(1)}% ($${o.volume.toLocaleString()} vol)`)
      .join("\n");

    const response = await client.chat.complete({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are a sharp prediction market analyst. Current date: ${now}.
You have access to LIVE CONTEXT from someone at a real event (conference, rally, game) via smart glasses.
Your job: find information edges the market hasn't priced in yet.

Key analysis angles:
- Does the transcript reveal insider sentiment, crowd energy, or breaking info?
- Are current odds misaligned with what you're hearing on the ground?
- Which outcome is mispriced given the live context?
- What risk could flip the market?

Be specific. Reference actual transcript details. No hedging.`,
        },
        {
          role: "user",
          content: `MARKET: ${market.title}

CURRENT ODDS:
${marketSummary}

LIVE TRANSCRIPT FROM EVENT:
"${transcript}"

Provide strategic analysis. Which outcome has edge? What's undervalued?`,
        },
      ],
      responseFormat: {
        type: "json_schema",
        jsonSchema: {
          name: "strategy_analysis",
          strict: true,
          schemaDefinition: STRATEGY_SCHEMA,
        },
      },
      temperature: 0.3,
    });

    const raw = response.choices?.[0]?.message?.content;
    if (!raw || typeof raw !== "string") return null;

    const result = JSON.parse(raw) as StrategyAnalysis;

    // Sanitise
    if (result.summary) result.summary = cleanText(result.summary);
    if (result.edge) result.edge = cleanText(result.edge);
    if (result.undervalued) result.undervalued = cleanText(result.undervalued);
    if (result.risk) result.risk = cleanText(result.risk);

    return result;
  } catch (err) {
    console.error("[mistral] analyzeStrategy error:", err);
    return null;
  }
}
