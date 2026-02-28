"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, Radio } from "lucide-react";
import type { PolymarketMarket } from "@/lib/types/polymarket-stream";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";

interface MarketsSidebarProps {
  markets: PolymarketMarket[];
  isStreaming?: boolean;
  className?: string;
}

export function MarketsSidebar({
  markets,
  isStreaming = false,
  className,
}: MarketsSidebarProps) {
  const openOrderModal = useArbitrageStore((s) => s.openOrderModal);

  return (
    <>
      <div
        className={cn(
          "w-80 border-l border-border/50 flex flex-col bg-card/30",
          className
        )}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border/30 flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-chart-4" />
            <span className="text-sm font-bold tracking-wide">LIVE MARKETS</span>
          </div>
          {markets.length > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] font-mono bg-chart-4/20 text-chart-4 rounded">
              {markets.length}
            </span>
          )}
        </div>

        {/* Markets List */}
        <div className="flex-1 overflow-y-auto scrollbar-terminal p-3 space-y-2">
          {markets.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 py-8">
              <TrendingUp className="h-8 w-8 mb-3" />
              <p className="text-sm font-medium">No markets detected</p>
              <p className="text-xs mt-1 text-center px-4">
                {isStreaming
                  ? "Analyzing transcript..."
                  : "Start stream to detect markets"}
              </p>
            </div>
          ) : (
            markets.map((market) => (
              <MarketCard
                key={market.id}
                market={market}
                onClick={() => openOrderModal(market)}
              />
            ))
          )}
        </div>
      </div>

    </>
  );
}

function MarketCard({
  market,
  onClick,
}: {
  market: PolymarketMarket;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-3 rounded-lg border border-border/50 bg-card hover:border-primary/40 hover:bg-card/80 transition-all group"
    >
      {/* Header */}
      <div className="flex gap-3 mb-2">
        {market.image && (
          <img
            src={market.image}
            alt=""
            className="w-10 h-10 rounded-md object-cover shrink-0 border border-border/30"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {market.question || market.title}
          </h3>
        </div>
      </div>

      {/* Volume */}
      {market.volume && (
        <p className="text-[10px] font-mono text-muted-foreground mb-2">
          VOL: ${parseFloat(market.volume).toLocaleString()}
        </p>
      )}

      {/* Top outcomes */}
      {market.markets && market.markets.length > 0 && (
        <div className="space-y-1 mb-2">
          {market.markets.slice(0, 2).map((outcome, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate mr-2">
                {outcome.outcome}
              </span>
              <span
                className={cn(
                  "font-mono font-bold",
                  outcome.price >= 0.7
                    ? "text-chart-4"
                    : outcome.price <= 0.3
                    ? "text-destructive"
                    : "text-foreground"
                )}
              >
                {(outcome.price * 100).toFixed(0)}¢
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Sparkline */}
      {market.sparkline && market.sparkline.length > 1 && (
        <div className="h-6 flex items-end gap-px">
          {market.sparkline.slice(-20).map((v, i) => (
            <div
              key={i}
              className="flex-1 bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors"
              style={{ height: `${Math.max(v * 100, 8)}%` }}
            />
          ))}
        </div>
      )}
    </button>
  );
}
