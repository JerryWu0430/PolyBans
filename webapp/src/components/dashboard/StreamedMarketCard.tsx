"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkline } from "@/components/ui/sparkline";
import { cn } from "@/lib/utils";
import type { PolymarketMarket } from "@/lib/types/polymarket-stream";
import {
  ChevronDown,
  ChevronUp,
  ExternalLink,
  DollarSign,
  TrendingUp,
} from "lucide-react";

interface StreamedMarketCardProps {
  market: PolymarketMarket;
  onRemove?: (id: string) => void;
}

export function StreamedMarketCard({ market, onRemove }: StreamedMarketCardProps) {
  const [expanded, setExpanded] = useState(false);

  const { id, title, question, volume, markets, sparkline, image, slug } = market;
  const primaryOutcome = markets?.[0];
  const yesPrice = primaryOutcome?.outcomePrices
    ? parseFloat(primaryOutcome.outcomePrices)
    : null;

  return (
    <Card className="transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1">
            {image && (
              <img
                src={image}
                alt=""
                className="w-10 h-10 rounded object-cover shrink-0"
              />
            )}
            <CardTitle className="text-sm font-medium line-clamp-2 flex-1">
              {question || title}
            </CardTitle>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 shrink-0"
              onClick={() => onRemove(id)}
            >
              ×
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Sparkline + Current odds */}
        <div className="flex items-center justify-between gap-3">
          {sparkline && sparkline.length > 1 && (
            <Sparkline data={sparkline} width={80} height={28} />
          )}
          {yesPrice !== null && (
            <Badge variant="outline" className="text-sm font-mono">
              YES {Math.round(yesPrice * 100)}¢
            </Badge>
          )}
        </div>

        {/* Volume */}
        {volume && (
          <div className="flex items-center gap-2">
            <DollarSign className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              ${parseFloat(volume).toLocaleString()} volume
            </span>
          </div>
        )}

        {/* Outcomes */}
        {markets && markets.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {markets.slice(0, 2).map((outcome, i) => (
              <Badge
                key={i}
                variant="secondary"
                className={cn(
                  "text-[10px]",
                  i === 0 ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-600"
                )}
              >
                {outcome.groupItemTitle || outcome.outcome || (i === 0 ? "Yes" : "No")}
                {outcome.outcomePrices && ` ${Math.round(parseFloat(outcome.outcomePrices) * 100)}¢`}
              </Badge>
            ))}
          </div>
        )}

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
            {/* Sparkline trend */}
            {sparkline && sparkline.length > 1 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <TrendingUp className="h-3 w-3" />
                <span>
                  {sparkline[sparkline.length - 1] >= sparkline[0]
                    ? "Trending up"
                    : "Trending down"}{" "}
                  from {Math.round(sparkline[0] * 100)}¢ to{" "}
                  {Math.round(sparkline[sparkline.length - 1] * 100)}¢
                </span>
              </div>
            )}

            {/* Link */}
            {slug && (
              <a
                href={`https://polymarket.com/event/${slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View on Polymarket
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
