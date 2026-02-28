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
}

const RESPONSE_SCHEMA = {
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
        schemaDefinition: RESPONSE_SCHEMA,
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
