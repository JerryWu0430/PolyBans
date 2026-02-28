"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  ExternalLink,
  X,
  Radio,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { PolymarketMarket } from "@/lib/types/polymarket-stream";

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
  const [selectedMarket, setSelectedMarket] = useState<PolymarketMarket | null>(null);

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
                onClick={() => setSelectedMarket(market)}
              />
            ))
          )}
        </div>
      </div>

      {/* Market Detail Modal */}
      <Dialog open={!!selectedMarket} onOpenChange={() => setSelectedMarket(null)}>
        <DialogContent className="sm:max-w-lg">
          {selectedMarket && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-start gap-3">
                  {selectedMarket.image && (
                    <img
                      src={selectedMarket.image}
                      alt=""
                      className="w-14 h-14 rounded-lg object-cover shrink-0 border border-border/30"
                    />
                  )}
                  <span className="leading-snug">
                    {selectedMarket.question || selectedMarket.title}
                  </span>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 mt-4">
                {/* Volume */}
                {selectedMarket.volume && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Volume</span>
                    <span className="font-mono font-bold">
                      ${parseFloat(selectedMarket.volume).toLocaleString()}
                    </span>
                  </div>
                )}

                {/* Outcomes */}
                {selectedMarket.markets && selectedMarket.markets.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Outcomes
                    </span>
                    <div className="space-y-2">
                      {selectedMarket.markets.map((outcome, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                        >
                          <span className="text-sm">{outcome.outcome}</span>
                          <div className="flex items-center gap-3">
                            <span
                              className={cn(
                                "text-lg font-mono font-bold",
                                outcome.price >= 0.7
                                  ? "text-chart-4"
                                  : outcome.price <= 0.3
                                  ? "text-destructive"
                                  : "text-foreground"
                              )}
                            >
                              {(outcome.price * 100).toFixed(0)}¢
                            </span>
                            {outcome.volume && (
                              <span className="text-[10px] font-mono text-muted-foreground">
                                ${parseFloat(outcome.volume).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Sparkline */}
                {selectedMarket.sparkline && selectedMarket.sparkline.length > 1 && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Price History
                    </span>
                    <div className="h-16 flex items-end gap-0.5 p-3 rounded-lg bg-muted/30 border border-border/30">
                      {selectedMarket.sparkline.map((v, i) => (
                        <div
                          key={i}
                          className="flex-1 bg-primary/50 rounded-sm"
                          style={{ height: `${Math.max(v * 100, 4)}%` }}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Link */}
                <a
                  href={`https://polymarket.com/event/${selectedMarket.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
                >
                  View on Polymarket
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
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
