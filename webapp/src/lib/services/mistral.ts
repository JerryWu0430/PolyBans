import { Mistral } from "@mistralai/mistralai";
import type { AnalysisContext, AnalysisResult } from "@/lib/types";

const SYSTEM_PROMPT = `You are an arbitrage analysis assistant for Polymarket prediction markets.
Your job is to analyze transcripts (from podcasts, news, speeches) and extract:
1. Entities: teams, candidates, events, companies that could be bet on
2. Suggested Polymarket search queries
3. Overall sentiment (bullish/bearish/neutral) with confidence

Respond in JSON format:
{
  "sentiment": "bullish" | "bearish" | "neutral",
  "confidence": 0.0-1.0,
  "summary": "Brief analysis",
  "entities": [{"name": "...", "type": "team|candidate|event|company|other", "relevance": 0.0-1.0}],
  "suggestedQueries": ["query1", "query2"]
}`;

function getClient(): Mistral {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error("MISTRAL_API_KEY not configured");
  }
  return new Mistral({ apiKey });
}

export async function analyzeTranscript(
  transcript: string,
  context?: Partial<AnalysisContext>
): Promise<AnalysisResult> {
  const client = getClient();

  const userMessage = context?.userIntent
    ? `Context: ${context.userIntent}\n\nTranscript:\n${transcript}`
    : `Transcript:\n${transcript}`;

  const response = await client.chat.complete({
    model: "mistral-small-latest",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
    responseFormat: { type: "json_object" },
  });

  const content = response.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("No response from Mistral");
  }

  const parsed = JSON.parse(content);
  return {
    sentiment: parsed.sentiment ?? "neutral",
    confidence: parsed.confidence ?? 0.5,
    summary: parsed.summary ?? "",
    entities: parsed.entities ?? [],
    suggestedQueries: parsed.suggestedQueries ?? [],
  };
}

export async function streamAnalysis(
  transcript: string,
  onChunk: (chunk: string) => void
): Promise<void> {
  const client = getClient();

  const stream = await client.chat.stream({
    model: "mistral-small-latest",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Transcript:\n${transcript}` },
    ],
  });

  for await (const event of stream) {
    const content = event.data.choices?.[0]?.delta?.content;
    if (content && typeof content === "string") {
      onChunk(content);
    }
  }
}
