"use client";

import { X } from "lucide-react";
import type {
  TradeConfirmationState,
  SubMarket,
  PolymarketMarket,
  MockTradeResult,
} from "@/lib/types/polymarket-stream";

interface TradeConfirmationBannerProps {
  state: TradeConfirmationState;
  market: PolymarketMarket | null;
  subMarket: SubMarket | null;
  timeoutProgress: number;
  lastTradeResult: MockTradeResult | null;
  onCancel: () => void;
}

const STATE_LABELS: Record<TradeConfirmationState, string> = {
  idle: "",
  market_announced: "ANNOUNCING MARKET...",
  awaiting_confirmation: "AWAITING VOICE CONFIRMATION",
  executing: "EXECUTING...",
  done: "TRADE EXECUTED",
  cancelled: "TRADE CANCELLED",
};

export function TradeConfirmationBanner({
  state,
  market,
  subMarket,
  timeoutProgress,
  lastTradeResult,
  onCancel,
}: TradeConfirmationBannerProps) {
  if (state === "idle") return null;

  const priceCents = subMarket ? Math.round(subMarket.yesPrice * 100) : 0;
  const label = STATE_LABELS[state];

  const isSuccess = state === "done";
  const isCancelled = state === "cancelled";
  const isAwaiting = state === "awaiting_confirmation";

  const borderColor = isSuccess
    ? "border-chart-4/50"
    : isCancelled
      ? "border-destructive/50"
      : "border-chart-2/50";

  const labelColor = isSuccess
    ? "text-chart-4"
    : isCancelled
      ? "text-destructive"
      : "text-chart-2";

  return (
    <div
      className={`px-4 py-3 bg-card/90 border-t ${borderColor} font-mono text-sm`}
    >
      {/* State label */}
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-xs font-bold tracking-wider ${labelColor}`}>
          {label}
        </span>
        {isAwaiting && (
          <button
            onClick={onCancel}
            className="p-0.5 rounded hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* Market info */}
      {subMarket && market && !isSuccess && (
        <div className="text-xs text-muted-foreground mb-2">
          <span className="text-foreground">{subMarket.groupItemTitle}</span>
          {" — "}
          <span className="text-primary">Yes at {priceCents}¢</span>
          <span className="ml-2 text-muted-foreground/70">
            ({market.title})
          </span>
        </div>
      )}

      {/* Trade result */}
      {isSuccess && lastTradeResult && (
        <div className="text-xs text-muted-foreground">
          Bought{" "}
          <span className="text-chart-4">{lastTradeResult.shares} shares</span>{" "}
          of <span className="text-foreground">{lastTradeResult.outcome}</span>{" "}
          at{" "}
          <span className="text-primary">
            {Math.round(lastTradeResult.price * 100)}¢
          </span>
          <span className="ml-2 text-muted-foreground/50">
            ID: {lastTradeResult.orderId}
          </span>
        </div>
      )}

      {/* Countdown progress bar */}
      {isAwaiting && (
        <div className="h-1 bg-background/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-chart-2 transition-all duration-100 ease-linear"
            style={{ width: `${100 - timeoutProgress}%` }}
          />
        </div>
      )}
    </div>
  );
}
