"use client";

import { useState, useCallback, useRef } from "react";
import type {
  PolymarketMarket,
  SubMarket,
  TradeConfirmationState,
  MockTradeResult,
} from "@/lib/types/polymarket-stream";

const CONFIRMATION_TIMEOUT_MS = 15_000;
const PROGRESS_TICK_MS = 100;
const MOCK_EXECUTION_DELAY_MS = 1_200;
const MOCK_SHARES = 10;

const CONFIRM_RE = /\bconfirm\b/i;
const CANCEL_RE = /\bcancel\b/i;

interface UseTradeConfirmationOptions {
  sendTts: (text: string) => Promise<void>;
}

export interface UseTradeConfirmationReturn {
  confirmationState: TradeConfirmationState;
  pendingMarket: PolymarketMarket | null;
  pendingSubMarket: SubMarket | null;
  timeoutProgress: number;
  lastTradeResult: MockTradeResult | null;
  handleNewMarkets: (markets: PolymarketMarket[]) => void;
  interceptTranscript: (text: string) => boolean;
  manualCancel: () => void;
}

export function useTradeConfirmation({
  sendTts,
}: UseTradeConfirmationOptions): UseTradeConfirmationReturn {
  const [confirmationState, setConfirmationState] =
    useState<TradeConfirmationState>("idle");
  const [pendingMarket, setPendingMarket] = useState<PolymarketMarket | null>(null);
  const [pendingSubMarket, setPendingSubMarket] = useState<SubMarket | null>(null);
  const [timeoutProgress, setTimeoutProgress] = useState(0);
  const [lastTradeResult, setLastTradeResult] = useState<MockTradeResult | null>(null);

  // Refs for timer callbacks (avoid stale closures)
  const stateRef = useRef<TradeConfirmationState>("idle");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingQueueRef = useRef<PolymarketMarket[] | null>(null);
  const pendingMarketRef = useRef<PolymarketMarket | null>(null);
  const pendingSubMarketRef = useRef<SubMarket | null>(null);

  const setState = useCallback((state: TradeConfirmationState) => {
    stateRef.current = state;
    setConfirmationState(state);
  }, []);

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (progressIntervalRef.current) {
      clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setTimeoutProgress(0);
  }, []);

  const returnToIdle = useCallback(() => {
    clearTimers();
    setState("idle");
    setPendingMarket(null);
    setPendingSubMarket(null);
    pendingMarketRef.current = null;
    pendingSubMarketRef.current = null;

    // Process queued markets if any
    const queued = pendingQueueRef.current;
    if (queued) {
      pendingQueueRef.current = null;
      // Defer to next tick so state fully settles
      setTimeout(() => announceMarkets(queued), 0);
    }
  }, [clearTimers, setState]);

  const startConfirmationTimer = useCallback(() => {
    const startTime = Date.now();

    progressIntervalRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const pct = Math.min((elapsed / CONFIRMATION_TIMEOUT_MS) * 100, 100);
      setTimeoutProgress(pct);
    }, PROGRESS_TICK_MS);

    timeoutRef.current = setTimeout(() => {
      clearTimers();
      setState("cancelled");
      sendTts("Trade cancelled.").catch(console.error);
      setTimeout(() => returnToIdle(), 2_000);
    }, CONFIRMATION_TIMEOUT_MS);
  }, [clearTimers, setState, sendTts, returnToIdle]);

  const announceMarkets = useCallback(
    (markets: PolymarketMarket[]) => {
      const market = markets[0];
      if (!market || !market.subMarkets || market.subMarkets.length === 0) return;

      const sub = market.subMarkets[0];
      const pct = Math.round(sub.yesPrice * 100);

      setPendingMarket(market);
      setPendingSubMarket(sub);
      pendingMarketRef.current = market;
      pendingSubMarketRef.current = sub;
      setState("market_announced");

      const announcement = `${sub.groupItemTitle} at ${pct} percent. Say confirm to trade, or cancel.`;
      sendTts(announcement)
        .then(() => {
          // Only transition if still in market_announced (not cancelled in between)
          if (stateRef.current === "market_announced") {
            setState("awaiting_confirmation");
            startConfirmationTimer();
          }
        })
        .catch(console.error);
    },
    [setState, sendTts, startConfirmationTimer]
  );

  const executeTrade = useCallback(() => {
    clearTimers();
    setState("executing");

    const market = pendingMarketRef.current;
    const sub = pendingSubMarketRef.current;
    if (!market || !sub) return;

    const price = sub.yesPrice;
    const shares = MOCK_SHARES;
    const totalCost = Math.round(price * shares * 100) / 100;

    setTimeout(() => {
      const result: MockTradeResult = {
        orderId: `MOCK-${Date.now().toString(36).toUpperCase()}`,
        market: market.title,
        outcome: sub.groupItemTitle,
        price,
        shares,
        totalCost,
        executedAt: Date.now(),
      };
      setLastTradeResult(result);
      setState("done");

      const priceCents = Math.round(price * 100);
      const resultMsg = `Trade executed. Bought ${shares} shares of Yes at ${priceCents} cents.`;
      sendTts(resultMsg).catch(console.error);

      setTimeout(() => returnToIdle(), 3_000);
    }, MOCK_EXECUTION_DELAY_MS);
  }, [clearTimers, setState, sendTts, returnToIdle]);

  const handleNewMarkets = useCallback(
    (markets: PolymarketMarket[]) => {
      if (markets.length === 0) return;

      const currentState = stateRef.current;
      if (currentState === "idle") {
        announceMarkets(markets);
      } else {
        // Queue latest markets — single slot, latest wins
        pendingQueueRef.current = markets;
      }
    },
    [announceMarkets]
  );

  const interceptTranscript = useCallback(
    (text: string): boolean => {
      if (stateRef.current !== "awaiting_confirmation") return false;

      if (CONFIRM_RE.test(text)) {
        executeTrade();
        return true;
      }
      if (CANCEL_RE.test(text)) {
        clearTimers();
        setState("cancelled");
        sendTts("Trade cancelled.").catch(console.error);
        setTimeout(() => returnToIdle(), 2_000);
        return true;
      }

      return false;
    },
    [executeTrade, clearTimers, setState, sendTts, returnToIdle]
  );

  const manualCancel = useCallback(() => {
    const currentState = stateRef.current;
    if (
      currentState === "awaiting_confirmation" ||
      currentState === "market_announced"
    ) {
      clearTimers();
      setState("cancelled");
      sendTts("Trade cancelled.").catch(console.error);
      setTimeout(() => returnToIdle(), 2_000);
    }
  }, [clearTimers, setState, sendTts, returnToIdle]);

  return {
    confirmationState,
    pendingMarket,
    pendingSubMarket,
    timeoutProgress,
    lastTradeResult,
    handleNewMarkets,
    interceptTranscript,
    manualCancel,
  };
}
