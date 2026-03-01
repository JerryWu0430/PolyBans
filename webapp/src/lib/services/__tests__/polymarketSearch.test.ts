import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  parseJsonArray,
  transformMarkets,
  transformToSubMarkets,
  getSparkline,
  fetchMarkets,
} from "../polymarketSearch";

describe("parseJsonArray", () => {
  it("parses a valid JSON array string", () => {
    expect(parseJsonArray('["Yes","No"]')).toEqual(["Yes", "No"]);
  });

  it("returns empty array for undefined", () => {
    expect(parseJsonArray(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(parseJsonArray("")).toEqual([]);
  });

  it("returns empty array for invalid JSON", () => {
    expect(parseJsonArray("{not-json")).toEqual([]);
  });

  it("returns empty array for non-array JSON", () => {
    expect(parseJsonArray('{"key":"val"}')).toEqual([]);
  });
});

describe("transformMarkets", () => {
  it("transforms raw markets to MarketOutcome[]", () => {
    const raw = [
      {
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.65","0.35"]',
        clobTokenIds: '["tok1","tok2"]',
        volume: "1000",
      },
    ];
    const result = transformMarkets(raw);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({
      outcome: "Yes",
      price: 0.65,
      volume: "1000",
      clobTokenId: "tok1",
    });
    expect(result[1].outcome).toBe("No");
    expect(result[1].price).toBe(0.35);
  });

  it("caps at 4 markets", () => {
    const raw = Array.from({ length: 6 }, (_, i) => ({
      outcomes: '["Yes"]',
      outcomePrices: '["0.5"]',
      volume: String(i),
    }));
    const result = transformMarkets(raw);
    // 4 markets * 1 outcome each = 4
    expect(result).toHaveLength(4);
  });

  it("defaults NaN prices to 0", () => {
    const raw = [
      {
        outcomes: '["Yes"]',
        outcomePrices: '["not-a-number"]',
        volume: "100",
      },
    ];
    const result = transformMarkets(raw);
    expect(result[0].price).toBe(0);
  });

  it("returns empty array for undefined input", () => {
    expect(transformMarkets(undefined)).toEqual([]);
  });

  it("returns empty array for non-array input", () => {
    expect(transformMarkets("bad" as unknown as undefined)).toEqual([]);
  });
});

describe("transformToSubMarkets", () => {
  it("transforms markets with price filtering", () => {
    const raw = [
      {
        outcomes: '["Yes","No"]',
        outcomePrices: '["0.7","0.3"]',
        clobTokenIds: '["tok1","tok2"]',
        volume: "5000",
        question: "Will X happen?",
        groupItemTitle: "X",
        slug: "x-slug",
      },
    ];
    const result = transformToSubMarkets(raw);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      question: "Will X happen?",
      groupItemTitle: "X",
      yesPrice: 0.7,
      noPrice: 0.3,
      volume: "5000",
      slug: "x-slug",
    });
  });

  it("filters out markets with null prices", () => {
    const raw = [
      {
        outcomePrices: "null",
        volume: "100",
        question: "Placeholder",
      },
    ];
    expect(transformToSubMarkets(raw)).toEqual([]);
  });

  it("filters out markets with zero volume", () => {
    const raw = [
      {
        outcomePrices: '["0.5","0.5"]',
        volume: "0",
        question: "Dead market",
      },
    ];
    expect(transformToSubMarkets(raw)).toEqual([]);
  });

  it("caps at 10 sub-markets", () => {
    const raw = Array.from({ length: 15 }, (_, i) => ({
      outcomes: '["Yes","No"]',
      outcomePrices: '["0.5","0.5"]',
      clobTokenIds: '["tok"]',
      volume: String(i + 1),
      question: `Market ${i}`,
      groupItemTitle: `M${i}`,
      slug: `slug-${i}`,
    }));
    expect(transformToSubMarkets(raw)).toHaveLength(10);
  });

  it("returns empty array for undefined", () => {
    expect(transformToSubMarkets(undefined)).toEqual([]);
  });
});

describe("getSparkline", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches price history from CLOB API", async () => {
    const mockHistory = { history: [{ p: 0.5 }, { p: 0.6 }, { p: 0.7 }] };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockHistory),
    });

    const result = await getSparkline("token123");
    expect(result).toEqual([0.5, 0.6, 0.7]);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("token123")
    );
  });

  it("returns empty array for empty token", async () => {
    const result = await getSparkline("");
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("returns empty array on fetch error", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("net error"));
    const result = await getSparkline("tok");
    expect(result).toEqual([]);
  });
});

describe("fetchMarkets", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function mockGammaResponse(events: Array<{ id: string; volume: string; title: string }>) {
    return {
      ok: true,
      json: () =>
        Promise.resolve({
          events: events.map((e) => ({
            ...e,
            slug: e.id,
            question: e.title,
            markets: [],
            image: null,
          })),
        }),
    };
  }

  it("deduplicates by event ID", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      mockGammaResponse([
        { id: "evt1", volume: "1000", title: "Event 1" },
      ])
    );

    const result = await fetchMarkets(["query1", "query2"]);
    // Both queries return same event ID, should be deduped
    expect(result).toHaveLength(1);
  });

  it("sorts by volume descending and caps at 4", async () => {
    const events = Array.from({ length: 6 }, (_, i) => ({
      id: `evt${i}`,
      volume: String((i + 1) * 1000),
      title: `Event ${i}`,
    }));
    // Return different events for each query (3 per query, 6 total)
    let callCount = 0;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      const batch = callCount === 0 ? events.slice(0, 3) : events.slice(3, 6);
      callCount++;
      return Promise.resolve(mockGammaResponse(batch));
    });

    const result = await fetchMarkets(["q1", "q2"]);
    expect(result.length).toBeLessThanOrEqual(4);
    // Check descending order
    for (let i = 1; i < result.length; i++) {
      expect(Number(result[i - 1].volume)).toBeGreaterThanOrEqual(
        Number(result[i].volume)
      );
    }
  });
});
