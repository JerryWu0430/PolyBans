// Mock stream transcript data for MVP
import type { TranscriptChunk } from "../types/stream";

const MOCK_TRANSCRIPTS = [
  "So looking at the latest polls, Trump is leading in Pennsylvania by about 3 points",
  "The market odds on Polymarket are showing 65% for Trump right now",
  "But here's the thing - the prediction markets might be overreacting to this news",
  "Bitcoin just broke above 95,000 dollars, which is a huge psychological level",
  "The Fed is expected to cut rates by 25 basis points next meeting",
  "Elon Musk just tweeted about Dogecoin again, and it's pumping",
  "There's a significant divergence between what the polls say and what the markets are pricing",
  "The January unemployment numbers came in much better than expected",
  "Gold is hitting all-time highs as inflation concerns persist",
  "The Supreme Court is expected to rule on the TikTok case any day now",
  "Senate confirmation hearings for the new Treasury Secretary start tomorrow",
  "Tesla stock is up 8% after the earnings beat",
  "The CPI report next week will be crucial for market direction",
  "Sources say there might be a ceasefire deal in the Middle East",
  "China just announced new stimulus measures for their economy",
];

export interface MockStreamOptions {
  intervalMs?: number;
  onChunk: (chunk: TranscriptChunk) => void;
  onEnd?: () => void;
}

export function startMockStream(options: MockStreamOptions): () => void {
  const { intervalMs = 3000, onChunk, onEnd } = options;
  let index = 0;
  let isRunning = true;

  const sendChunk = () => {
    if (!isRunning) return;

    const text = MOCK_TRANSCRIPTS[index % MOCK_TRANSCRIPTS.length];
    onChunk({
      text,
      timestamp: Date.now(),
      speaker: "Host",
    });

    index++;

    if (index < MOCK_TRANSCRIPTS.length * 2) {
      setTimeout(sendChunk, intervalMs + Math.random() * 1000);
    } else {
      onEnd?.();
    }
  };

  // Start after short delay
  setTimeout(sendChunk, 500);

  // Return cleanup function
  return () => {
    isRunning = false;
  };
}
