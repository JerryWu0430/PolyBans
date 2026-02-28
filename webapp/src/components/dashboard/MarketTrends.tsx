"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import type { Market } from "@/lib/types/polymarket";
import {
  TrendingUp,
  TrendingDown,
  Flame,
  RefreshCw,
  Plus,
  ExternalLink,
} from "lucide-react";

// Category colors
const categoryColors: Record<string, string> = {
  Sports: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  Politics: "bg-red-500/10 text-red-600 border-red-500/20",
  Crypto: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  Tech: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  Entertainment: "bg-pink-500/10 text-pink-600 border-pink-500/20",
  default: "bg-muted text-muted-foreground",
};

export function MarketTrends() {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setSelectedMarket = useArbitrageStore((s) => s.setSelectedMarket);

  const fetchMarkets = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/polymarket/markets?limit=10");
      if (!res.ok) throw new Error("Failed to fetch markets");
      const data = await res.json();
      setMarkets(data.markets || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
      // Fallback to mock data
      setMarkets(getMockMarkets());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarkets();
  }, []);

  // Mock 24h change for demo
  const get24hChange = (market: Market) => {
    // In production, this would come from the API
    const seed = market.id.charCodeAt(0);
    return ((seed % 20) - 10) / 10; // -1 to 1
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Flame className="h-4 w-4 text-orange-500" />
            Trending Markets
          </CardTitle>
          <CardAction>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchMarkets}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
          </CardAction>
        </div>
      </CardHeader>

      <CardContent className="flex-1 py-3">
        <ScrollArea className="h-full min-h-0">
          <div className="space-y-2">
        {loading ? (
          // Loading skeletons
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="p-3 rounded-lg border space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16" />
                <Skeleton className="h-5 w-12" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="text-center py-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="link" size="sm" onClick={fetchMarkets}>
              Retry
            </Button>
          </div>
        ) : markets.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground">
            No trending markets found
          </div>
        ) : (
          markets.map((market) => {
            const change = get24hChange(market);
            const volume = parseFloat(market.volume || "0");
            const categoryColor =
              categoryColors[market.category || ""] || categoryColors.default;

            return (
              <div
                key={market.id}
                className="p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => setSelectedMarket(market)}
              >
                {/* Title */}
                <p className="text-sm font-medium line-clamp-2 mb-2 group-hover:text-primary transition-colors">
                  {market.question}
                </p>

                {/* Stats row */}
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Volume */}
                  <span className="text-xs text-muted-foreground">
                    Vol: ${volume >= 1000 ? `${(volume / 1000).toFixed(1)}k` : volume.toFixed(0)}
                  </span>

                  {/* 24h change */}
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] px-1.5",
                      change > 0
                        ? "bg-green-500/10 text-green-600 border-green-500/20"
                        : change < 0
                          ? "bg-red-500/10 text-red-600 border-red-500/20"
                          : ""
                    )}
                  >
                    {change > 0 ? (
                      <TrendingUp className="h-2.5 w-2.5 mr-0.5" />
                    ) : change < 0 ? (
                      <TrendingDown className="h-2.5 w-2.5 mr-0.5" />
                    ) : null}
                    {change > 0 ? "+" : ""}
                    {(change * 100).toFixed(0)}%
                  </Badge>

                  {/* Category */}
                  {market.category && (
                    <Badge
                      variant="outline"
                      className={cn("text-[10px] px-1.5", categoryColor)}
                    >
                      {market.category}
                    </Badge>
                  )}
                </div>

                {/* Actions (visible on hover) */}
                <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="sm" className="h-6 text-xs">
                    <Plus className="h-3 w-3 mr-1" />
                    Watch
                  </Button>
                  {market.slug && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 text-xs"
                      asChild
                    >
                      <a
                        href={`https://polymarket.com/event/${market.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        View
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            );
          })
        )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

// Mock data fallback
function getMockMarkets(): Market[] {
  return [
    {
      id: "1",
      question: "Will Bitcoin hit $100K by March 2026?",
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.72", "0.28"],
      volume: "2500000",
      category: "Crypto",
      slug: "bitcoin-100k-march-2026",
    },
    {
      id: "2",
      question: "Will the Lakers win the NBA Championship?",
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.15", "0.85"],
      volume: "890000",
      category: "Sports",
      slug: "lakers-nba-championship",
    },
    {
      id: "3",
      question: "Will AI replace 50% of jobs by 2030?",
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.35", "0.65"],
      volume: "1200000",
      category: "Tech",
      slug: "ai-jobs-2030",
    },
    {
      id: "4",
      question: "Will the Fed cut rates in Q2 2026?",
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.58", "0.42"],
      volume: "3100000",
      category: "Politics",
      slug: "fed-rate-cut-q2-2026",
    },
    {
      id: "5",
      question: "Will Ethereum flip Bitcoin market cap?",
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.08", "0.92"],
      volume: "450000",
      category: "Crypto",
      slug: "ethereum-flip-bitcoin",
    },
  ];
}
