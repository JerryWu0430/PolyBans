"use client";

import { cn } from "@/lib/utils";
import {
  ExternalLink,
  TrendingUp,
  BarChart3,
  Droplets,
  Brain,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";

export function MarketOrderModal() {
  const { selectedMarketForOrder, isOrderModalOpen, closeOrderModal, latestAnalysis } =
    useArbitrageStore();

  const market = selectedMarketForOrder;

  return (
    <Dialog open={isOrderModalOpen} onOpenChange={closeOrderModal}>
      <DialogContent className="sm:max-w-xl">
        {market && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-start gap-4">
                {market.image && (
                  <img
                    src={market.image}
                    alt=""
                    className="w-16 h-16 rounded-xl object-cover shrink-0 border border-border/30"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <span className="leading-snug block">
                    {market.question || market.title}
                  </span>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-4">
              {/* Volume & Liquidity */}
              <div className="grid grid-cols-2 gap-3">
                {market.volume && (
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                    <BarChart3 className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                        Volume
                      </p>
                      <p className="text-sm font-mono font-bold">
                        ${parseFloat(market.volume).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border/30">
                  <Droplets className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                      Liquidity
                    </p>
                    <p className="text-sm font-mono font-bold text-chart-4">
                      Active
                    </p>
                  </div>
                </div>
              </div>

              {/* Outcomes with Prices */}
              {market.markets && market.markets.length > 0 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Current Prices
                  </span>
                  <div className="space-y-2">
                    {market.markets.map((outcome, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30"
                      >
                        <div className="flex items-center gap-2">
                          <TrendingUp
                            className={cn(
                              "h-4 w-4",
                              outcome.price >= 0.5
                                ? "text-chart-4"
                                : "text-muted-foreground"
                            )}
                          />
                          <span className="text-sm font-medium">
                            {outcome.outcome}
                          </span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span
                            className={cn(
                              "text-xl font-mono font-bold tabular-nums",
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
                              ${parseFloat(outcome.volume).toLocaleString()} vol
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sparkline Chart (Larger) */}
              {market.sparkline && market.sparkline.length > 1 && (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Price History
                  </span>
                  <div className="h-24 flex items-end gap-0.5 p-4 rounded-lg bg-muted/30 border border-border/30">
                    {market.sparkline.map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/60 hover:bg-primary transition-colors rounded-sm"
                        style={{ height: `${Math.max(v * 100, 4)}%` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Mistral AI Analysis Summary */}
              {latestAnalysis && (
                <div className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <Brain className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      AI Analysis
                    </span>
                  </div>
                  <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
                    <p className="text-sm text-foreground/90 leading-relaxed">
                      {latestAnalysis.reason ||
                        "Market detected based on transcript analysis."}
                    </p>
                    {latestAnalysis.queries && latestAnalysis.queries.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {latestAnalysis.queries.map((query, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-[10px] font-mono bg-primary/10 text-primary rounded"
                          >
                            {query}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Primary CTA */}
              <a
                href={`https://polymarket.com/event/${market.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-3.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-semibold text-base"
              >
                Trade on Polymarket
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
