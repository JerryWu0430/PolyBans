import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTradeConfirmation } from "../useTradeConfirmation";
import type { PolymarketMarket } from "@/lib/types/polymarket-stream";

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeMarket(overrides: Partial<PolymarketMarket> = {}): PolymarketMarket {
  return {
    id: "mkt-1",
    slug: "lakers-win",
    title: "Will the Lakers win?",
    question: "Will the Lakers win tonight?",
    volume: "500000",
    subMarkets: [
      {
        question: "Will the Lakers win tonight?",
        groupItemTitle: "Lakers to win",
        yesPrice: 0.62,
        noPrice: 0.38,
        volume: "500000",
        clobTokenId: "tok-1",
        slug: "lakers-win",
      },
    ],
    markets: [],
    sparkline: [],
    image: null,
    ...overrides,
  };
}

function setup(sendTts?: ReturnType<typeof vi.fn>) {
  const tts = sendTts ?? vi.fn().mockResolvedValue(undefined);
  const hook = renderHook(() => useTradeConfirmation({ sendTts: tts }));
  return { tts, hook };
}

/** Flush microtasks (TTS promise) without advancing fake timers */
async function flushMicrotasks() {
  await act(async () => {});
}

/** Announce markets and advance to awaiting_confirmation */
async function announceAndAwait(
  hook: ReturnType<typeof setup>["hook"],
  markets: PolymarketMarket[] = [makeMarket()]
) {
  act(() => hook.result.current.handleNewMarkets(markets));
  await flushMicrotasks(); // resolve TTS promise → awaiting_confirmation
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("useTradeConfirmation", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("starts in idle state", () => {
    const { hook } = setup();
    expect(hook.result.current.confirmationState).toBe("idle");
    expect(hook.result.current.pendingMarket).toBeNull();
    expect(hook.result.current.pendingSubMarket).toBeNull();
    expect(hook.result.current.lastTradeResult).toBeNull();
    expect(hook.result.current.timeoutProgress).toBe(0);
  });

  it("ignores empty markets array", () => {
    const { hook, tts } = setup();
    act(() => hook.result.current.handleNewMarkets([]));
    expect(hook.result.current.confirmationState).toBe("idle");
    expect(tts).not.toHaveBeenCalled();
  });

  it("ignores markets with no subMarkets", () => {
    const { hook, tts } = setup();
    act(() => hook.result.current.handleNewMarkets([makeMarket({ subMarkets: [] })]));
    expect(hook.result.current.confirmationState).toBe("idle");
    expect(tts).not.toHaveBeenCalled();
  });

  describe("announcement flow", () => {
    it("transitions to market_announced and sends TTS", () => {
      const { hook, tts } = setup();
      act(() => hook.result.current.handleNewMarkets([makeMarket()]));

      expect(hook.result.current.confirmationState).toBe("market_announced");
      expect(hook.result.current.pendingMarket).not.toBeNull();
      expect(hook.result.current.pendingSubMarket).not.toBeNull();
      expect(tts).toHaveBeenCalledWith(
        "Lakers to win at 62 percent. Say confirm to trade, or cancel."
      );
    });

    it("transitions to awaiting_confirmation after TTS resolves", async () => {
      const { hook } = setup();
      await announceAndAwait(hook);
      expect(hook.result.current.confirmationState).toBe("awaiting_confirmation");
    });
  });

  describe("interceptTranscript", () => {
    it("returns false when idle", () => {
      const { hook } = setup();
      let result: boolean;
      act(() => {
        result = hook.result.current.interceptTranscript("confirm");
      });
      expect(result!).toBe(false);
    });

    it("returns false when in market_announced (not yet awaiting)", () => {
      const { hook } = setup();
      act(() => hook.result.current.handleNewMarkets([makeMarket()]));
      expect(hook.result.current.confirmationState).toBe("market_announced");

      let result: boolean;
      act(() => {
        result = hook.result.current.interceptTranscript("confirm");
      });
      expect(result!).toBe(false);
    });

    it("returns false for unrelated text during awaiting_confirmation", async () => {
      const { hook } = setup();
      await announceAndAwait(hook);
      expect(hook.result.current.confirmationState).toBe("awaiting_confirmation");

      let result: boolean;
      act(() => {
        result = hook.result.current.interceptTranscript("hello world");
      });
      expect(result!).toBe(false);
      expect(hook.result.current.confirmationState).toBe("awaiting_confirmation");
    });

    it("detects 'confirm' (case-insensitive) and transitions to executing", async () => {
      const { hook } = setup();
      await announceAndAwait(hook);

      let consumed: boolean;
      act(() => {
        consumed = hook.result.current.interceptTranscript("I CONFIRM this");
      });
      expect(consumed!).toBe(true);
      expect(hook.result.current.confirmationState).toBe("executing");
    });

    it("detects 'cancel' and transitions to cancelled", async () => {
      const { hook, tts } = setup();
      await announceAndAwait(hook);

      let consumed: boolean;
      act(() => {
        consumed = hook.result.current.interceptTranscript("please cancel");
      });
      expect(consumed!).toBe(true);
      expect(hook.result.current.confirmationState).toBe("cancelled");
      expect(tts).toHaveBeenCalledWith("Trade cancelled.");
    });

    it("does not match partial words like 'confirmation'", async () => {
      const { hook } = setup();
      await announceAndAwait(hook);

      let consumed: boolean;
      act(() => {
        consumed = hook.result.current.interceptTranscript("confirmation needed");
      });
      expect(consumed!).toBe(false);
    });
  });

  describe("mock trade execution", () => {
    it("produces a MockTradeResult after confirm", async () => {
      const { hook, tts } = setup();
      await announceAndAwait(hook);

      act(() => hook.result.current.interceptTranscript("confirm"));
      expect(hook.result.current.confirmationState).toBe("executing");

      // Advance past the 1.2s mock execution delay
      await act(async () => {
        vi.advanceTimersByTime(1300);
      });
      await flushMicrotasks();

      expect(hook.result.current.confirmationState).toBe("done");
      const result = hook.result.current.lastTradeResult;
      expect(result).not.toBeNull();
      expect(result!.orderId).toMatch(/^MOCK-/);
      expect(result!.market).toBe("Will the Lakers win?");
      expect(result!.outcome).toBe("Lakers to win");
      expect(result!.price).toBe(0.62);
      expect(result!.shares).toBe(10);
      expect(result!.totalCost).toBe(6.2);

      expect(tts).toHaveBeenCalledWith(
        "Trade executed. Bought 10 shares of Yes at 62 cents."
      );
    });

    it("returns to idle after done + 3s delay", async () => {
      const { hook } = setup();
      await announceAndAwait(hook);

      act(() => hook.result.current.interceptTranscript("confirm"));
      await act(async () => { vi.advanceTimersByTime(1300); });
      await flushMicrotasks();
      expect(hook.result.current.confirmationState).toBe("done");

      await act(async () => { vi.advanceTimersByTime(3100); });
      expect(hook.result.current.confirmationState).toBe("idle");
    });
  });

  describe("timeout auto-cancel", () => {
    it("auto-cancels after 15s with no response", async () => {
      const { hook, tts } = setup();
      await announceAndAwait(hook);
      expect(hook.result.current.confirmationState).toBe("awaiting_confirmation");

      await act(async () => { vi.advanceTimersByTime(15_000); });
      await flushMicrotasks();
      expect(hook.result.current.confirmationState).toBe("cancelled");
      expect(tts).toHaveBeenCalledWith("Trade cancelled.");

      await act(async () => { vi.advanceTimersByTime(2100); });
      expect(hook.result.current.confirmationState).toBe("idle");
    });
  });

  describe("manual cancel", () => {
    it("cancels during awaiting_confirmation", async () => {
      const { hook, tts } = setup();
      await announceAndAwait(hook);

      act(() => hook.result.current.manualCancel());
      expect(hook.result.current.confirmationState).toBe("cancelled");
      expect(tts).toHaveBeenCalledWith("Trade cancelled.");
    });

    it("cancels during market_announced", () => {
      const { hook } = setup();
      act(() => hook.result.current.handleNewMarkets([makeMarket()]));
      expect(hook.result.current.confirmationState).toBe("market_announced");

      act(() => hook.result.current.manualCancel());
      expect(hook.result.current.confirmationState).toBe("cancelled");
    });

    it("does nothing when idle", () => {
      const { hook } = setup();
      act(() => hook.result.current.manualCancel());
      expect(hook.result.current.confirmationState).toBe("idle");
    });
  });

  describe("market queuing", () => {
    it("queues markets arriving during active confirmation", async () => {
      const { hook, tts } = setup();
      const market1 = makeMarket();
      const market2 = makeMarket({
        id: "mkt-2",
        title: "Will BTC hit 100k?",
        subMarkets: [
          {
            question: "Will BTC hit 100k?",
            groupItemTitle: "BTC 100k",
            yesPrice: 0.45,
            noPrice: 0.55,
            volume: "1000000",
            clobTokenId: "tok-2",
            slug: "btc-100k",
          },
        ],
      });

      // Start first market flow
      await announceAndAwait(hook, [market1]);
      expect(hook.result.current.confirmationState).toBe("awaiting_confirmation");

      // Queue second market during confirmation
      act(() => hook.result.current.handleNewMarkets([market2]));
      expect(hook.result.current.confirmationState).toBe("awaiting_confirmation");
      expect(hook.result.current.pendingSubMarket?.groupItemTitle).toBe("Lakers to win");

      // Cancel first → should announce queued market after return-to-idle
      act(() => hook.result.current.interceptTranscript("cancel"));
      expect(hook.result.current.confirmationState).toBe("cancelled");

      // Wait for return-to-idle (2s) then the deferred setTimeout(0) for queued market
      await act(async () => { vi.advanceTimersByTime(2100); });
      await flushMicrotasks();

      // TTS mock resolves instantly so it advances past market_announced
      expect(["market_announced", "awaiting_confirmation"]).toContain(
        hook.result.current.confirmationState
      );
      expect(tts).toHaveBeenCalledWith(
        "BTC 100k at 45 percent. Say confirm to trade, or cancel."
      );
    });

    it("latest queued market wins (single slot)", async () => {
      const { hook, tts } = setup();
      await announceAndAwait(hook);

      // Queue two markets in succession — only last should survive
      act(() =>
        hook.result.current.handleNewMarkets([
          makeMarket({
            id: "mkt-2",
            subMarkets: [
              {
                question: "Q2",
                groupItemTitle: "Market A",
                yesPrice: 0.3,
                noPrice: 0.7,
                volume: "100",
                clobTokenId: "t2",
                slug: "a",
              },
            ],
          }),
        ])
      );
      act(() =>
        hook.result.current.handleNewMarkets([
          makeMarket({
            id: "mkt-3",
            subMarkets: [
              {
                question: "Q3",
                groupItemTitle: "Market B",
                yesPrice: 0.8,
                noPrice: 0.2,
                volume: "200",
                clobTokenId: "t3",
                slug: "b",
              },
            ],
          }),
        ])
      );

      // Cancel and wait for queued to announce
      act(() => hook.result.current.interceptTranscript("cancel"));
      await act(async () => { vi.advanceTimersByTime(2100); });
      await flushMicrotasks();

      expect(tts).toHaveBeenCalledWith(
        "Market B at 80 percent. Say confirm to trade, or cancel."
      );
    });
  });
});
