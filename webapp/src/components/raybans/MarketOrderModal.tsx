"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  ExternalLink,
  TrendingUp,
  BarChart3,
  Droplets,
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import type { SubMarket } from "@/lib/types/polymarket-stream";

export function MarketOrderModal() {
  const { selectedMarketForOrder, isOrderModalOpen, closeOrderModal } =
    useArbitrageStore();
  const [hoveredSubMarket, setHoveredSubMarket] = useState<SubMarket | null>(null);

  const market = selectedMarketForOrder;
  const hasSubMarkets = market?.subMarkets && market.subMarkets.length > 1;
  const embedSlug = hoveredSubMarket?.slug || market?.subMarkets?.[0]?.slug;

  return (
    <Dialog open={isOrderModalOpen} onOpenChange={closeOrderModal}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto overflow-x-hidden">
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

            {/* Two-column layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mt-2">
              {/* Left column - Market data */}
              <div className="lg:col-span-3 space-y-4">
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

                {/* Multi-outcome table layout */}
                {hasSubMarkets && (
                  <div className="space-y-2">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Market Outcomes
                    </span>
                    <ScrollArea className="rounded-lg border border-border/30 max-h-[280px]">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 sticky top-0">
                          <tr className="text-xs text-muted-foreground uppercase">
                            <th className="text-left p-2 font-medium">Outcome</th>
                            <th className="text-right p-2 font-medium">Prob</th>
                            <th className="text-right p-2 font-medium">Yes</th>
                            <th className="text-right p-2 font-medium">No</th>
                            <th className="text-right p-2 font-medium">Volume</th>
                          </tr>
                        </thead>
                        <tbody>
                          {market.subMarkets.map((sm, i) => (
                            <tr
                              key={i}
                              className={cn(
                                "border-t border-border/20 hover:bg-muted/20 cursor-pointer transition-colors",
                                hoveredSubMarket?.slug === sm.slug && "bg-muted/30"
                              )}
                              onMouseEnter={() => setHoveredSubMarket(sm)}
                              onMouseLeave={() => setHoveredSubMarket(null)}
                            >
                              <td className="p-2 font-medium truncate max-w-[180px]">
                                {sm.groupItemTitle}
                              </td>
                              <td className={cn(
                                "p-2 text-right font-mono font-bold tabular-nums",
                                sm.yesPrice >= 0.7 ? "text-chart-4" : sm.yesPrice <= 0.3 ? "text-destructive" : ""
                              )}>
                                {(sm.yesPrice * 100).toFixed(0)}%
                              </td>
                              <td className="p-2 text-right font-mono text-chart-4">
                                {(sm.yesPrice * 100).toFixed(1)}¢
                              </td>
                              <td className="p-2 text-right font-mono text-destructive">
                                {(sm.noPrice * 100).toFixed(1)}¢
                              </td>
                              <td className="p-2 text-right font-mono text-muted-foreground text-xs">
                                ${parseFloat(sm.volume).toLocaleString()}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </ScrollArea>
                  </div>
                )}

                {/* Single-outcome fallback (Yes/No markets) */}
                {!hasSubMarkets && market.markets && market.markets.length > 0 && (
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

              {/* Right column - Chart only */}
              <div className="lg:col-span-2">
                {embedSlug && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                        Live Chart
                      </span>
                      {hoveredSubMarket && (
                        <span className="text-xs text-muted-foreground truncate max-w-[150px]">
                          {hoveredSubMarket.groupItemTitle}
                        </span>
                      )}
                    </div>
                    <div className="rounded-lg overflow-hidden border border-border/30">
                      <iframe
                        key={embedSlug}
                        src={`https://embed.polymarket.com/market.html?market=${embedSlug}&features=volume&theme=dark`}
                        className="w-full h-[420px] border-0"
                        title="Polymarket Chart"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
