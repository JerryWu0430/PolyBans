"use client";

import { Card, CardContent, CardHeader, CardTitle, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useArbitrageStore, useFilteredOpportunities } from "@/lib/stores/arbitrageStore";
import { ArbitrageCard } from "./ArbitrageCard";
import { rankOpportunities } from "@/lib/utils/arbitrage";
import { SlidersHorizontal, Clock, TrendingUp, Sparkles, RefreshCw } from "lucide-react";
import { useState } from "react";

type SortOption = "spread" | "time" | "confidence";

export function ArbitrageList() {
  const opportunities = useFilteredOpportunities();
  const { filters, setFilters, removeOpportunity, clearOpportunities } = useArbitrageStore();
  const [sortBy, setSortBy] = useState<SortOption>("spread");
  const [showFilters, setShowFilters] = useState(false);

  // Sort opportunities
  const sortedOpportunities = [...opportunities].sort((a, b) => {
    switch (sortBy) {
      case "spread":
        return b.spread - a.spread;
      case "confidence":
        return b.confidence - a.confidence;
      case "time":
        return b.timestamp - a.timestamp;
      default:
        return 0;
    }
  });

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Arbitrage Opportunities
            <Badge variant="secondary">{opportunities.length}</Badge>
          </CardTitle>
          <CardAction className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal className="h-4 w-4" />
            </Button>
            {opportunities.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearOpportunities}
                title="Clear all"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </CardAction>
        </div>

        {/* Sort buttons */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-xs text-muted-foreground mr-2">Sort:</span>
          <Button
            variant={sortBy === "spread" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setSortBy("spread")}
          >
            <TrendingUp className="h-3 w-3 mr-1" />
            Spread
          </Button>
          <Button
            variant={sortBy === "confidence" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setSortBy("confidence")}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Confidence
          </Button>
          <Button
            variant={sortBy === "time" ? "secondary" : "ghost"}
            size="sm"
            className="h-6 text-xs"
            onClick={() => setSortBy("time")}
          >
            <Clock className="h-3 w-3 mr-1" />
            Time
          </Button>
        </div>

        {/* Filters panel */}
        {showFilters && (
          <div className="mt-3 p-3 bg-muted/50 rounded-lg space-y-3">
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Min Confidence: {Math.round(filters.minConfidence * 100)}%
              </label>
              <Input
                type="range"
                min="0"
                max="100"
                value={filters.minConfidence * 100}
                onChange={(e) =>
                  setFilters({ minConfidence: parseInt(e.target.value) / 100 })
                }
                className="h-2"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium">
                Min Spread: {Math.round(filters.minSpread * 100)}%
              </label>
              <Input
                type="range"
                min="0"
                max="20"
                value={filters.minSpread * 100}
                onChange={(e) =>
                  setFilters({ minSpread: parseInt(e.target.value) / 100 })
                }
                className="h-2"
              />
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="flex-1 overflow-auto py-4">
        {sortedOpportunities.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
              <TrendingUp className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium">Waiting for opportunities...</p>
            <p className="text-xs text-muted-foreground mt-1">
              Start Ray-Bans or Web Live mode to detect arbitrage
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedOpportunities.map((opp) => (
              <ArbitrageCard
                key={opp.id}
                opportunity={opp}
                onRemove={removeOpportunity}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
