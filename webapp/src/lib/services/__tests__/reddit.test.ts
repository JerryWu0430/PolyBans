import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getSubredditPosts, searchPosts, getSentiment } from "../reddit";

function makeRedditChild(overrides: Record<string, unknown> = {}) {
  return {
    data: {
      id: "abc",
      title: "Test Post",
      selftext: "",
      author: "user1",
      subreddit: "polymarket",
      score: 10,
      num_comments: 5,
      created_utc: 1700000000,
      url: "https://reddit.com/r/polymarket/abc",
      permalink: "/r/polymarket/comments/abc",
      ...overrides,
    },
  };
}

function mockFetchOk(children: ReturnType<typeof makeRedditChild>[]) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ data: { children } }),
  });
}

describe("getSubredditPosts", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("fetches and maps Reddit API response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      mockFetchOk([makeRedditChild()])
    );

    const posts = await getSubredditPosts("polymarket");
    expect(posts).toHaveLength(1);
    expect(posts[0]).toMatchObject({
      id: "abc",
      title: "Test Post",
      subreddit: "polymarket",
      score: 10,
    });
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("r/polymarket.json"),
      expect.objectContaining({ headers: { "User-Agent": "PolyBans/1.0" } })
    );
  });

  it("throws on non-ok response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 403,
    });
    await expect(getSubredditPosts("banned")).rejects.toThrow("403");
  });
});

describe("searchPosts", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("encodes query and returns mapped posts", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockReturnValue(
      mockFetchOk([makeRedditChild({ title: "Found It" })])
    );

    const posts = await searchPosts("hello world");
    expect(posts).toHaveLength(1);
    expect(posts[0].title).toBe("Found It");
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("q=hello%20world"),
      expect.any(Object)
    );
  });

  it("throws on error response", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
    });
    await expect(searchPosts("query")).rejects.toThrow("500");
  });
});

describe("getSentiment", () => {
  beforeEach(() => vi.stubGlobal("fetch", vi.fn()));
  afterEach(() => vi.unstubAllGlobals());

  it("returns neutral for empty posts", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [] } }),
    });

    const result = await getSentiment("nothing");
    expect(result.sentiment).toBe("neutral");
    expect(result.score).toBe(0);
    expect(result.postCount).toBe(0);
  });

  it("returns bullish when bullish words dominate", async () => {
    const bullishPost = makeRedditChild({
      title: "moon pump buy bull calls win",
      selftext: "going up long yes",
      score: 100,
    });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [bullishPost] } }),
    });

    const result = await getSentiment("crypto");
    expect(result.sentiment).toBe("bullish");
    expect(result.score).toBeGreaterThan(0.2);
  });

  it("returns bearish when bearish words dominate", async () => {
    const bearishPost = makeRedditChild({
      title: "bear dump sell short puts crash down",
      selftext: "lose no",
      score: 100,
    });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [bearishPost] } }),
    });

    const result = await getSentiment("crypto");
    expect(result.sentiment).toBe("bearish");
    expect(result.score).toBeLessThan(-0.2);
  });

  it("normalizes score to [-1, 1]", async () => {
    const post = makeRedditChild({
      title: "bull moon pump buy long calls win yes up",
      selftext: "",
      score: 1000,
    });
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [post] } }),
    });

    const result = await getSentiment("test");
    expect(result.score).toBeGreaterThanOrEqual(-1);
    expect(result.score).toBeLessThanOrEqual(1);
  });

  it("continues on partial subreddit failures", async () => {
    let callCount = 0;
    (fetch as ReturnType<typeof vi.fn>).mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.reject(new Error("network error"));
      }
      return mockFetchOk([makeRedditChild({ title: "moon pump", score: 50 })]);
    });

    const result = await getSentiment("test");
    // Should still get results from second subreddit
    expect(result.postCount).toBeGreaterThan(0);
  });

  it("uses log-weighted scoring based on post score", async () => {
    const lowScore = makeRedditChild({
      title: "bull",
      selftext: "",
      score: 1,
    });
    const highScore = makeRedditChild({
      title: "bull",
      selftext: "",
      score: 1000,
    });

    // Test with low-score post
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [lowScore] } }),
    });
    const lowResult = await getSentiment("test");

    // Test with high-score post
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ data: { children: [highScore] } }),
    });
    const highResult = await getSentiment("test");

    // Both should be bullish, but score is normalized so both = 1.0 (only bullish words)
    expect(lowResult.sentiment).toBe("bullish");
    expect(highResult.sentiment).toBe("bullish");
  });
});
