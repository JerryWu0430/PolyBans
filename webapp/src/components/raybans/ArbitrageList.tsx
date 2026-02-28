"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { ArbitrageOpp } from "@/lib/websocket/types";

interface ArbitrageListProps {
  opportunities: ArbitrageOpp[];
  onSelect?: (opp: ArbitrageOpp) => void;
  className?: string;
}

export function ArbitrageList({
  opportunities,
  onSelect,
  className,
}: ArbitrageListProps) {
  return (
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">
            Arbitrage Opportunities
          </CardTitle>
          <Badge variant="secondary" className="text-xs">
            {opportunities.length} found
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        {opportunities.length === 0 ? (
          <EmptyState />
        ) : (
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {opportunities.map((opp) => (
                <ArbitrageCard
                  key={opp.id}
                  opportunity={opp}
                  onClick={() => onSelect?.(opp)}
                />
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}

function ArbitrageCard({
  opportunity,
  onClick,
}: {
  opportunity: ArbitrageOpp;
  onClick?: () => void;
}) {
  const spreadPercent = (opportunity.spread * 100).toFixed(1);
  const confidencePercent = (opportunity.confidence * 100).toFixed(0);

  return (
    <Button
      variant="ghost"
      className="w-full h-auto p-3 justify-start text-left hover:bg-muted"
      onClick={onClick}
    >
      <div className="flex items-start justify-between w-full gap-2">
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">
            {opportunity.marketA.question}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            vs {opportunity.marketB.question}
          </div>
        </div>
        <div className="flex flex-col items-end shrink-0">
          <Badge
            variant={opportunity.spread >= 0.05 ? "default" : "secondary"}
            className={cn(
              "text-xs",
              opportunity.spread >= 0.05 && "bg-green-600 hover:bg-green-600"
            )}
          >
            +{spreadPercent}%
          </Badge>
          <span className="text-[10px] text-muted-foreground mt-0.5">
            {confidencePercent}% conf
          </span>
        </div>
      </div>
    </Button>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-6 text-center">
      <svg
        className="w-10 h-10 text-muted-foreground/30 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
        />
      </svg>
      <p className="text-sm text-muted-foreground">
        No opportunities yet
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Arbitrage cards appear from analysis
      </p>
    </div>
  );
}
