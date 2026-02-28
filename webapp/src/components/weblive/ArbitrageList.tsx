"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFilteredOpportunities, useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { cn } from "@/lib/utils";

export function ArbitrageList() {
  const opportunities = useFilteredOpportunities();
  const removeOpportunity = useArbitrageStore((s) => s.removeOpportunity);

  if (opportunities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Arbitrage Opportunities</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Opportunities will appear here as they are detected from the analysis...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span>Arbitrage Opportunities</span>
          <Badge variant="secondary">{opportunities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {opportunities.map((opp) => (
          <div
            key={opp.id}
            className="rounded-lg border p-3 space-y-2"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium line-clamp-1">
                  {opp.marketA.question}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-1">
                  vs {opp.marketB.question}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                onClick={() => removeOpportunity(opp.id)}
              >
                ×
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                variant="outline"
                className={cn(
                  "text-xs",
                  opp.spread > 0.05
                    ? "bg-green-500/10 text-green-600 border-green-500/20"
                    : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                )}
              >
                {(opp.spread * 100).toFixed(1)}% spread
              </Badge>
              <span className="text-xs text-muted-foreground">
                {Math.round(opp.confidence * 100)}% confidence
              </span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(opp.timestamp).toLocaleTimeString()}
              </span>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
