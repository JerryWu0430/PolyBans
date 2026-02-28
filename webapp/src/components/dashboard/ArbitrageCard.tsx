"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatSpread, formatOdds, getSuggestedPosition } from "@/lib/utils/arbitrage";
import type { ArbitrageOpp } from "@/lib/websocket/types";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  TrendingUp,
  TrendingDown,
  Brain,
  MessageSquare,
} from "lucide-react";

interface ArbitrageCardProps {
  opportunity: ArbitrageOpp;
  onRemove?: (id: string) => void;
}

export function ArbitrageCard({ opportunity, onRemove }: ArbitrageCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { marketA, spread, confidence, timestamp } = opportunity;
  const marketOdds = parseFloat(marketA.outcomePrices?.[0] || "0.5");
  const suggestedPosition = getSuggestedPosition(marketOdds, marketOdds + spread);

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
            {marketA.question}
          </CardTitle>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => onRemove(opportunity.id)}
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current odds */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Polymarket:</span>
          <Badge variant="outline" className="text-sm font-mono">
            YES {formatOdds(marketOdds)}
          </Badge>
        </div>

        {/* Position & confidence */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge
            className={cn(
              "text-xs",
              suggestedPosition === "YES"
                ? "bg-green-500/20 text-green-600 border-green-500/30"
                : "bg-red-500/20 text-red-600 border-red-500/30"
            )}
          >
            {suggestedPosition === "YES" ? (
              <TrendingUp className="h-3 w-3 mr-1" />
            ) : (
              <TrendingDown className="h-3 w-3 mr-1" />
            )}
            {suggestedPosition}
          </Badge>

          {/* Confidence bar */}
          <div className="flex items-center gap-1.5 flex-1">
            <div className="h-1.5 flex-1 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all"
                style={{ width: `${confidence * 100}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {Math.round(confidence * 100)}%
            </span>
          </div>
        </div>

        {/* Spread highlight */}
        <div className="flex items-center justify-between">
          <Badge
            variant="outline"
            className={cn(
              "text-xs font-mono",
              spread > 0.05
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : spread > 0.03
                  ? "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
                  : ""
            )}
          >
            {formatSpread(spread)} spread
          </Badge>

          {/* Source badges */}
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <Brain className="h-2.5 w-2.5 mr-0.5" />
              Mistral
            </Badge>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              <MessageSquare className="h-2.5 w-2.5 mr-0.5" />
              Reddit
            </Badge>
          </div>
        </div>

        {/* Expand/collapse */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3 mr-1" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3 mr-1" />
              Show details
            </>
          )}
        </Button>

        {/* Expanded content */}
        {expanded && (
          <div className="space-y-3 pt-2 border-t">
            {/* Analysis summary */}
            <div className="text-xs text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Analysis</p>
              <p>
                Market odds suggest {Math.round(marketOdds * 100)}% probability.
                Our analysis indicates a {formatSpread(spread)} divergence with{" "}
                {Math.round(confidence * 100)}% confidence.
              </p>
            </div>

            {/* Market details */}
            {marketA.category && (
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">
                  {marketA.category}
                </Badge>
                {marketA.volume && (
                  <span className="text-[10px] text-muted-foreground">
                    Vol: ${parseFloat(marketA.volume).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Timestamp & link */}
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{new Date(timestamp).toLocaleString()}</span>
              {marketA.slug && (
                <a
                  href={`https://polymarket.com/event/${marketA.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-primary hover:underline"
                >
                  View on Polymarket
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
