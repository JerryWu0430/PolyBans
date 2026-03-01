"use client";

import { cn } from "@/lib/utils";
import { TrendingUp, Radio, Brain, Sparkles, Target, AlertTriangle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "./Terminal";
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
  const latestAnalysis = useArbitrageStore((s) => s.latestAnalysis);
  const strategy = latestAnalysis?.strategy;

  return (
    <>
      <div
        className={cn(
          "flex-1 min-w-[280px] border-l border-border/50 flex flex-col bg-card/30 min-h-0",
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
            <span className="px-1.5 py-0.5 text-xs font-mono bg-chart-4/20 text-chart-4 rounded">
              {markets.length}
            </span>
          )}
        </div>

        {/* Markets Grid */}
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-3">
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
              <div className="grid grid-cols-5 gap-2">
                {markets.map((market) => (
                  <MarketCard
                    key={market.id}
                    market={market}
                    onClick={() => openOrderModal(market)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* AI Strategy Panel */}
        {strategy && (
          <div className="border-t border-border/30 p-3 bg-muted/20">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Brain className="h-3.5 w-3.5 text-chart-4" />
                <span className="text-xs font-bold uppercase tracking-wider">AI Strategy</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="px-1.5 py-0.5 text-xs font-bold uppercase rounded bg-muted text-muted-foreground">
                  {strategy.sentiment}
                </span>
                <span className="px-1.5 py-0.5 text-xs font-mono rounded border border-border/50 text-muted-foreground">
                  {strategy.confidence}
                </span>
              </div>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed mb-2 line-clamp-2">
              {strategy.summary}
            </p>
            <div className="grid grid-cols-3 gap-2">
              {strategy.edge && (
                <div className="p-2 rounded bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Sparkles className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Edge</span>
                  </div>
                  <p className="text-xs text-foreground/70 line-clamp-2">{strategy.edge}</p>
                </div>
              )}
              {strategy.undervalued && (
                <div className="p-2 rounded bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-1 mb-0.5">
                    <Target className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Target</span>
                  </div>
                  <p className="text-xs text-foreground/70 line-clamp-2">{strategy.undervalued}</p>
                </div>
              )}
              {strategy.risk && (
                <div className="p-2 rounded bg-muted/40 border border-border/30">
                  <div className="flex items-center gap-1 mb-0.5">
                    <AlertTriangle className="h-2.5 w-2.5 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase">Risk</span>
                  </div>
                  <p className="text-xs text-foreground/70 line-clamp-2">{strategy.risk}</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Fallback analysis if no strategy */}
        {latestAnalysis && !strategy && (
          <div className="border-t border-border/30 p-3 bg-muted/20">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Brain className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs font-bold text-muted-foreground uppercase">Analysis</span>
            </div>
            <p className="text-xs text-foreground/80 line-clamp-2">{latestAnalysis.reason}</p>
          </div>
        )}

        {/* Terminal */}
        <Terminal className="h-100" />
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
      className="w-full aspect-square text-left p-2 rounded-lg border border-border/50 bg-card hover:border-primary/40 hover:bg-card/80 transition-all group flex flex-col"
    >
      {/* Header */}
      <div className="flex gap-2 mb-1">
        {market.image && (
          <img
            src={market.image}
            alt=""
            className="w-7 h-7 rounded object-cover shrink-0 border border-border/30"
          />
        )}
        <h3 className="text-sm font-medium leading-tight line-clamp-2 group-hover:text-primary transition-colors flex-1">
          {market.question || market.title}
        </h3>
      </div>

      {/* Volume */}
      {market.volume && (
        <p className="text-xs font-mono text-muted-foreground mb-1">
          ${parseFloat(market.volume).toLocaleString()}
        </p>
      )}

      {/* Sub-markets preview */}
      <div className="mt-auto space-y-0.5">
        {market.subMarkets && market.subMarkets.length > 1 ? (
          <>
            {market.subMarkets.slice(0, 2).map((sm, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground truncate mr-1">
                  {sm.groupItemTitle}
                </span>
                <span
                  className={cn(
                    "font-mono font-bold shrink-0",
                    sm.yesPrice >= 0.7
                      ? "text-chart-4"
                      : sm.yesPrice <= 0.3
                      ? "text-destructive"
                      : "text-foreground"
                  )}
                >
                  {(sm.yesPrice * 100).toFixed(0)}%
                </span>
              </div>
            ))}
            {market.subMarkets.length > 2 && (
              <span className="text-xs text-muted-foreground">
                +{market.subMarkets.length - 2}
              </span>
            )}
          </>
        ) : market.markets && market.markets.length > 0 ? (
          market.markets.slice(0, 2).map((outcome, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground truncate mr-1">
                {outcome.outcome}
              </span>
              <span
                className={cn(
                  "font-mono font-bold shrink-0",
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
          ))
        ) : null}
      </div>
    </button>
  );
}
