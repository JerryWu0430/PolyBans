"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { formatOdds } from "@/lib/utils/arbitrage";
import { TrendingUp, TrendingDown, Minus, Brain, BarChart3, MessageSquare } from "lucide-react";

interface OddsData {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}

export function OddsComparison() {
  const selectedMarket = useArbitrageStore((s) => s.selectedMarket);
  const opportunities = useArbitrageStore((s) => s.opportunities);

  // Get the most recent opportunity for display
  const latestOpp = opportunities[opportunities.length - 1];

  // Mock data for demonstration - in production, this would come from real sources
  const polymarketOdds = latestOpp
    ? parseFloat(latestOpp.marketA.outcomePrices?.[0] || "0.5")
    : 0.5;
  const llmPrediction = latestOpp
    ? polymarketOdds + (latestOpp.spread * (Math.random() > 0.5 ? 1 : -1))
    : 0.55;
  const sentimentSignal = latestOpp
    ? Math.min(1, Math.max(0, polymarketOdds + (latestOpp.confidence - 0.5) * 0.2))
    : 0.52;

  const oddsData: OddsData[] = [
    {
      label: "Polymarket",
      value: polymarketOdds,
      color: "bg-blue-500",
      icon: <BarChart3 className="h-3 w-3" />,
    },
    {
      label: "LLM Prediction",
      value: llmPrediction,
      color: "bg-purple-500",
      icon: <Brain className="h-3 w-3" />,
    },
    {
      label: "Sentiment",
      value: sentimentSignal,
      color: "bg-orange-500",
      icon: <MessageSquare className="h-3 w-3" />,
    },
  ];

  // Calculate divergence
  const maxDivergence = Math.max(
    Math.abs(polymarketOdds - llmPrediction),
    Math.abs(polymarketOdds - sentimentSignal)
  );
  const divergenceLevel =
    maxDivergence > 0.1 ? "high" : maxDivergence > 0.05 ? "medium" : "low";

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Odds Comparison</CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              divergenceLevel === "high"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : divergenceLevel === "medium"
                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  : "bg-muted"
            )}
          >
            {divergenceLevel === "high" && <TrendingUp className="h-3 w-3 mr-1" />}
            {divergenceLevel === "medium" && <Minus className="h-3 w-3 mr-1" />}
            {divergenceLevel === "low" && <TrendingDown className="h-3 w-3 mr-1" />}
            {divergenceLevel} divergence
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Market title */}
        {latestOpp && (
          <p className="text-sm text-muted-foreground line-clamp-1">
            {latestOpp.marketA.question}
          </p>
        )}

        {/* Bar chart comparison */}
        <div className="space-y-3">
          {oddsData.map((data) => (
            <div key={data.label} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  {data.icon}
                  {data.label}
                </span>
                <span className="font-mono font-medium">
                  {formatOdds(data.value)}
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all", data.color)}
                  style={{ width: `${data.value * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Divergence indicator */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Max Divergence</span>
            <span
              className={cn(
                "font-mono font-medium",
                maxDivergence > 0.1
                  ? "text-green-600"
                  : maxDivergence > 0.05
                    ? "text-yellow-600"
                    : "text-muted-foreground"
              )}
            >
              {(maxDivergence * 100).toFixed(1)}%
            </span>
          </div>

          {/* Visual divergence bar */}
          <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all",
                maxDivergence > 0.1
                  ? "bg-green-500"
                  : maxDivergence > 0.05
                    ? "bg-yellow-500"
                    : "bg-muted-foreground"
              )}
              style={{ width: `${Math.min(100, maxDivergence * 500)}%` }}
            />
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {oddsData.map((data) => (
            <div key={data.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <div className={cn("w-2 h-2 rounded-full", data.color)} />
              {data.label}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
