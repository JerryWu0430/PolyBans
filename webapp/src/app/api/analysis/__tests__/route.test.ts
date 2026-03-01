import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/mistral", () => ({
  analyze: vi.fn(),
  analyzeStrategy: vi.fn(),
}));

vi.mock("@/lib/services/polymarketSearch", () => ({
  fetchMarkets: vi.fn(),
}));

import { POST } from "../route";
import { analyze, analyzeStrategy } from "@/lib/services/mistral";
import { fetchMarkets } from "@/lib/services/polymarketSearch";

const mockAnalyze = analyze as ReturnType<typeof vi.fn>;
const mockAnalyzeStrategy = analyzeStrategy as ReturnType<typeof vi.fn>;
const mockFetchMarkets = fetchMarkets as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/analysis", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/analysis", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on missing transcript", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("transcript");
  });

  it("returns 400 on non-string transcript", async () => {
    const res = await POST(makeRequest({ transcript: 42 }));
    expect(res.status).toBe(400);
  });

  it("calls analyze and returns analysis when not detected", async () => {
    mockAnalyze.mockResolvedValue({
      detected: false,
      queries: [],
      tag: null,
      reason: "",
    });

    const res = await POST(makeRequest({ transcript: "test text" }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.analysis.detected).toBe(false);
    expect(data.markets).toEqual([]);
    expect(mockFetchMarkets).not.toHaveBeenCalled();
  });

  it("fetches markets when detected with queries", async () => {
    mockAnalyze.mockResolvedValue({
      detected: true,
      queries: ["bitcoin"],
      tag: "crypto",
      reason: "BTC discussion",
    });
    mockFetchMarkets.mockResolvedValue([]);

    const res = await POST(makeRequest({ transcript: "bitcoin talk" }));
    const data = await res.json();
    expect(mockFetchMarkets).toHaveBeenCalledWith(["bitcoin"], "crypto");
    expect(data.markets).toEqual([]);
  });

  it("runs strategy analysis on top market with sub-markets", async () => {
    mockAnalyze.mockResolvedValue({
      detected: true,
      queries: ["election"],
      tag: "politics",
      reason: "Election discussion",
    });
    mockFetchMarkets.mockResolvedValue([
      {
        id: "evt1",
        title: "2024 Election",
        subMarkets: [
          { groupItemTitle: "Candidate A", yesPrice: 0.6, volume: "5000" },
        ],
        markets: [],
      },
    ]);
    mockAnalyzeStrategy.mockResolvedValue({
      summary: "Strong edge detected",
      sentiment: "bullish",
      confidence: "high",
      risk: "Low",
    });

    const res = await POST(makeRequest({ transcript: "election talk" }));
    const data = await res.json();
    expect(mockAnalyzeStrategy).toHaveBeenCalled();
    expect(data.analysis.strategy).toBeDefined();
    expect(data.analysis.strategy.summary).toBe("Strong edge detected");
  });

  it("skips strategy when no markets found", async () => {
    mockAnalyze.mockResolvedValue({
      detected: true,
      queries: ["test"],
      tag: null,
      reason: "test",
    });
    mockFetchMarkets.mockResolvedValue([]);

    await POST(makeRequest({ transcript: "text" }));
    expect(mockAnalyzeStrategy).not.toHaveBeenCalled();
  });

  it("returns 500 on thrown error", async () => {
    mockAnalyze.mockRejectedValue(new Error("AI service down"));

    const res = await POST(makeRequest({ transcript: "test" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("AI service down");
  });
});
