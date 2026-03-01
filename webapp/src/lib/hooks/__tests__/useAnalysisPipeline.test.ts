import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { MIN_CHARS_TO_PROCESS } from "@/lib/services/transcriptBuffer";

// Mock the arbitrage store
const mockSetStreamedMarkets = vi.fn();
const mockSetLatestAnalysis = vi.fn();
const mockSetStoreBuffering = vi.fn();

vi.mock("@/lib/stores/arbitrageStore", () => ({
  useArbitrageStore: vi.fn(() => ({
    setStreamedMarkets: mockSetStreamedMarkets,
    setLatestAnalysis: mockSetLatestAnalysis,
    setBuffering: mockSetStoreBuffering,
  })),
}));

import { useAnalysisPipeline } from "../useAnalysisPipeline";

describe("useAnalysisPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns initial null state", () => {
    const { result } = renderHook(() => useAnalysisPipeline());
    expect(result.current.analysis).toBeNull();
    expect(result.current.markets).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isProcessing).toBe(false);
    expect(result.current.flushCount).toBe(0);
  });

  it("updates buffering state on sendTranscript", () => {
    const { result } = renderHook(() => useAnalysisPipeline());

    act(() => {
      result.current.sendTranscript("hello world");
    });

    expect(result.current.buffering).not.toBeNull();
    expect(result.current.buffering!.chars).toBeGreaterThan(0);
    expect(result.current.buffering!.threshold).toBe(MIN_CHARS_TO_PROCESS);
  });

  it("does not call API when below threshold", () => {
    const { result } = renderHook(() => useAnalysisPipeline());

    act(() => {
      result.current.sendTranscript("short text");
    });

    expect(fetch).not.toHaveBeenCalled();
  });

  it("flushes and calls API when threshold reached", async () => {
    const mockResponse = {
      analysis: { detected: true, queries: ["test"], tag: null, reason: "test" },
      markets: [],
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useAnalysisPipeline());

    await act(async () => {
      result.current.sendTranscript("a".repeat(MIN_CHARS_TO_PROCESS + 10));
    });

    expect(fetch).toHaveBeenCalledWith("/api/analysis", expect.objectContaining({
      method: "POST",
    }));
  });

  it("updates store on successful API response with markets", async () => {
    const mockMarkets = [{ id: "m1", title: "Market 1" }];
    const mockResponse = {
      analysis: { detected: true, queries: ["q"], tag: null, reason: "r" },
      markets: mockMarkets,
    };
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    });

    const { result } = renderHook(() => useAnalysisPipeline());

    await act(async () => {
      result.current.sendTranscript("a".repeat(MIN_CHARS_TO_PROCESS + 10));
    });

    expect(mockSetLatestAnalysis).toHaveBeenCalledWith(mockResponse.analysis);
    expect(mockSetStreamedMarkets).toHaveBeenCalledWith(mockMarkets);
  });

  it("sets error on API failure", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.resolve({ error: "Server error" }),
    });

    const { result } = renderHook(() => useAnalysisPipeline());

    await act(async () => {
      result.current.sendTranscript("a".repeat(MIN_CHARS_TO_PROCESS + 10));
    });

    expect(result.current.error).toBe("Server error");
  });

  it("handles fetch rejection gracefully", async () => {
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Network error")
    );

    const { result } = renderHook(() => useAnalysisPipeline());

    await act(async () => {
      result.current.sendTranscript("a".repeat(MIN_CHARS_TO_PROCESS + 10));
    });

    expect(result.current.error).toBe("Network error");
  });

  it("resets all state on reset()", async () => {
    const { result } = renderHook(() => useAnalysisPipeline());

    act(() => {
      result.current.sendTranscript("some data");
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.buffering).toBeNull();
    expect(result.current.analysis).toBeNull();
    expect(result.current.markets).toEqual([]);
    expect(result.current.error).toBeNull();
    expect(result.current.isProcessing).toBe(false);
    expect(mockSetStoreBuffering).toHaveBeenCalledWith(null);
  });
});
