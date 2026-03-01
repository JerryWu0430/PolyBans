"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, Radio, Brain, Sparkles, Target, AlertTriangle, X, ChevronRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Terminal } from "./Terminal";
import type { PolymarketMarket, TradeConfirmationState, StrategyAnalysis, PolymarketAnalysis } from "@/lib/types/polymarket-stream";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";

type CardHighlight = "pending" | "confirmed" | "cancelled" | null;

interface MarketsSidebarProps {
  markets: PolymarketMarket[];
  isStreaming?: boolean;
  className?: string;
  confirmationState?: TradeConfirmationState;
  pendingMarketId?: string;
}

export function MarketsSidebar({
  markets,
  isStreaming = false,
  className,
  confirmationState,
  pendingMarketId,
}: MarketsSidebarProps) {
  // Determine highlight for pending market
  const getHighlight = (marketId: string): CardHighlight => {
    if (marketId !== pendingMarketId) return null;
    switch (confirmationState) {
      case "market_announced":
      case "awaiting_confirmation":
      case "executing":
        return "pending";
      case "done":
        return "confirmed";
      case "cancelled":
        return "cancelled";
      default:
        return null;
    }
  };
  const openOrderModal = useArbitrageStore((s) => s.openOrderModal);
  const latestAnalysis = useArbitrageStore((s) => s.latestAnalysis);
  const strategy = latestAnalysis?.strategy;
  const [showStrategyModal, setShowStrategyModal] = useState(false);

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
                    highlight={getHighlight(market.id)}
                    onClick={() => openOrderModal(market)}
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>

        {/* AI Strategy Panel - Clickable */}
        {strategy && (
          <button
            onClick={() => setShowStrategyModal(true)}
            className="w-full text-left border-t border-border/30 p-3 bg-muted/20 hover:bg-muted/40 transition-colors cursor-pointer group"
          >
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
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
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
          </button>
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

      {/* Strategy Modal */}
      {showStrategyModal && strategy && (
        <StrategyModal
          strategy={strategy}
          analysis={latestAnalysis}
          onClose={() => setShowStrategyModal(false)}
        />
      )}
    </>
  );
}

function MarketCard({
  market,
  highlight,
  onClick,
}: {
  market: PolymarketMarket;
  highlight: CardHighlight;
  onClick: () => void;
}) {
  const highlightStyles = {
    pending: "border-yellow-500 bg-yellow-500/10 ring-2 ring-yellow-500/30",
    confirmed: "border-green-500 bg-green-500/10 ring-2 ring-green-500/30",
    cancelled: "border-red-500 bg-red-500/10 ring-2 ring-red-500/30",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full aspect-square text-left p-2 rounded-lg border border-border/50 bg-card hover:border-primary/40 hover:bg-card/80 transition-all group flex flex-col",
        highlight && highlightStyles[highlight]
      )}
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

function StrategyModal({
  strategy,
  analysis,
  onClose,
}: {
  strategy: StrategyAnalysis;
  analysis: PolymarketAnalysis | null;
  onClose: () => void;
}) {
  const sentimentColors = {
    bullish: "text-green-500 bg-green-500/20",
    bearish: "text-red-500 bg-red-500/20",
    neutral: "text-gray-500 bg-gray-500/20",
    mixed: "text-yellow-500 bg-yellow-500/20",
  };

  const confidenceColors = {
    high: "text-green-500 border-green-500/50",
    medium: "text-yellow-500 border-yellow-500/50",
    low: "text-red-500 border-red-500/50",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg mx-4 bg-card border border-border rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-chart-4" />
            <span className="font-bold">AI Strategy Analysis</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Badges */}
          <div className="flex items-center gap-2">
            <span className={cn("px-2 py-1 text-sm font-bold uppercase rounded", sentimentColors[strategy.sentiment])}>
              {strategy.sentiment}
            </span>
            <span className={cn("px-2 py-1 text-sm font-mono rounded border", confidenceColors[strategy.confidence])}>
              {strategy.confidence} confidence
            </span>
            {analysis?.tag && (
              <span className="px-2 py-1 text-sm font-mono rounded bg-muted text-muted-foreground">
                {analysis.tag}
              </span>
            )}
          </div>

          {/* Summary */}
          <div>
            <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Summary</h4>
            <p className="text-sm leading-relaxed">{strategy.summary}</p>
          </div>

          {/* Reason */}
          {analysis?.reason && (
            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Detection Reason</h4>
              <p className="text-sm leading-relaxed text-foreground/80">{analysis.reason}</p>
            </div>
          )}

          {/* Queries */}
          {analysis?.queries && analysis.queries.length > 0 && (
            <div>
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-1">Search Queries</h4>
              <div className="flex flex-wrap gap-1.5">
                {analysis.queries.map((q, i) => (
                  <span key={i} className="px-2 py-0.5 text-xs font-mono bg-muted rounded">
                    {q}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Edge */}
          {strategy.edge && (
            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Sparkles className="h-4 w-4 text-green-500" />
                <h4 className="text-sm font-bold text-green-500">Edge Detected</h4>
              </div>
              <p className="text-sm leading-relaxed">{strategy.edge}</p>
            </div>
          )}

          {/* Undervalued */}
          {strategy.undervalued && (
            <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <Target className="h-4 w-4 text-blue-500" />
                <h4 className="text-sm font-bold text-blue-500">Undervalued Outcome</h4>
              </div>
              <p className="text-sm leading-relaxed">{strategy.undervalued}</p>
            </div>
          )}

          {/* Risk */}
          {strategy.risk && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="h-4 w-4 text-red-500" />
                <h4 className="text-sm font-bold text-red-500">Risk Warning</h4>
              </div>
              <p className="text-sm leading-relaxed">{strategy.risk}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded font-medium hover:bg-primary/90 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
