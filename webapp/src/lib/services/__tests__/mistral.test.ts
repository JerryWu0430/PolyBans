import { describe, it, expect, vi, beforeEach } from "vitest";

const mockComplete = vi.fn();

vi.mock("@mistralai/mistralai", () => {
  const MockMistral = vi.fn();
  MockMistral.prototype.chat = { complete: (...args: unknown[]) => mockComplete(...args) };
  return { Mistral: MockMistral };
});

// Must import AFTER vi.mock due to hoisting
import { analyze, analyzeStrategy, describeFrame } from "../mistral";

function chatResponse(content: string | null) {
  return {
    choices: [{ message: { content } }],
  };
}

describe("analyze", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns structured signal from transcript", async () => {
    const signal = {
      detected: true,
      queries: ["bitcoin price"],
      tag: "crypto",
      reason: "Discussing BTC price movements",
    };
    mockComplete.mockResolvedValue(chatResponse(JSON.stringify(signal)));

    const result = await analyze("They're talking about bitcoin going up");
    expect(result.detected).toBe(true);
    expect(result.queries).toContain("bitcoin price");
    expect(result.tag).toBe("crypto");
  });

  it("returns default signal on null response", async () => {
    mockComplete.mockResolvedValue(chatResponse(null));

    const result = await analyze("some transcript");
    expect(result.detected).toBe(false);
    expect(result.queries).toEqual([]);
    expect(result.tag).toBeNull();
  });

  it("returns default signal on non-string response", async () => {
    mockComplete.mockResolvedValue({
      choices: [{ message: { content: 42 } }],
    });

    const result = await analyze("test");
    expect(result.detected).toBe(false);
  });

  it("cleans render tags from reason", async () => {
    const signal = {
      detected: true,
      queries: ["query"],
      tag: null,
      reason: "Some reason <grok:render>junk</grok:render> here",
    };
    mockComplete.mockResolvedValue(chatResponse(JSON.stringify(signal)));

    const result = await analyze("test");
    expect(result.reason).toBe("Some reason  here");
    expect(result.reason).not.toContain("grok:render");
  });

  it("defaults tag to null when missing", async () => {
    const signal = {
      detected: true,
      queries: ["q"],
      reason: "reason",
    };
    mockComplete.mockResolvedValue(chatResponse(JSON.stringify(signal)));

    const result = await analyze("test");
    expect(result.tag).toBeNull();
  });
});

describe("analyzeStrategy", () => {
  beforeEach(() => vi.clearAllMocks());

  const sampleMarket = {
    title: "Will X happen?",
    outcomes: [
      { name: "Yes", probability: 0.65, volume: 10000 },
      { name: "No", probability: 0.35, volume: 5000 },
    ],
  };

  it("returns strategy analysis for a market", async () => {
    const strategy = {
      summary: "Market favors Yes based on transcript context",
      edge: "Insider info detected",
      undervalued: "No at 35%",
      sentiment: "bullish",
      confidence: "high",
      risk: "Policy reversal possible",
    };
    mockComplete.mockResolvedValue(chatResponse(JSON.stringify(strategy)));

    const result = await analyzeStrategy("transcript text", sampleMarket);
    expect(result).not.toBeNull();
    expect(result!.summary).toContain("Market favors");
    expect(result!.sentiment).toBe("bullish");
  });

  it("formats market outcomes in the prompt", async () => {
    const strategy = {
      summary: "test",
      sentiment: "neutral",
      confidence: "low",
      risk: "none",
    };
    mockComplete.mockResolvedValue(chatResponse(JSON.stringify(strategy)));

    await analyzeStrategy("transcript", sampleMarket);
    const callArgs = mockComplete.mock.calls[0][0];
    const userMsg = callArgs.messages.find((m: { role: string }) => m.role === "user");
    expect(userMsg.content).toContain("Will X happen?");
    expect(userMsg.content).toContain("Yes");
  });

  it("returns null on null response", async () => {
    mockComplete.mockResolvedValue(chatResponse(null));

    const result = await analyzeStrategy("test", sampleMarket);
    expect(result).toBeNull();
  });

  it("returns null on error", async () => {
    mockComplete.mockRejectedValue(new Error("API error"));

    const result = await analyzeStrategy("test", sampleMarket);
    expect(result).toBeNull();
  });

  it("cleans render tags from strategy fields", async () => {
    const strategy = {
      summary: "Good <grok:render>x</grok:render> summary",
      edge: "Edge <grok:render>y</grok:render> info",
      undervalued: null,
      sentiment: "bullish",
      confidence: "high",
      risk: "Risk <grok:render>z</grok:render> factor",
    };
    mockComplete.mockResolvedValue(chatResponse(JSON.stringify(strategy)));

    const result = await analyzeStrategy("test", sampleMarket);
    expect(result!.summary).not.toContain("grok:render");
    expect(result!.edge).not.toContain("grok:render");
    expect(result!.risk).not.toContain("grok:render");
  });
});

describe("describeFrame", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sends base64 image and returns description", async () => {
    mockComplete.mockResolvedValue(chatResponse("A person giving a speech at a podium"));

    const result = await describeFrame("base64imagedata");
    expect(result).toBe("A person giving a speech at a podium");
  });

  it("strips surrounding quotes from response", async () => {
    mockComplete.mockResolvedValue(chatResponse('"A person walking"'));

    const result = await describeFrame("base64imagedata");
    expect(result).toBe("A person walking");
  });

  it("returns empty string on null response", async () => {
    mockComplete.mockResolvedValue(chatResponse(null));

    const result = await describeFrame("base64imagedata");
    expect(result).toBe("");
  });
});
