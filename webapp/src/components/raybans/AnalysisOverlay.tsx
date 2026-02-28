"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  Search,
  Sparkles,
  Loader2,
  Lightbulb,
} from "lucide-react";
import type { AnalysisResult, ExtractedEntity } from "@/lib/types/analysis";

interface AnalysisOverlayProps {
  analysis: AnalysisResult | null;
  isLoading?: boolean;
  onQueryClick?: (query: string) => void;
  className?: string;
}

export function AnalysisOverlay({
  analysis,
  isLoading = false,
  onQueryClick,
  className,
}: AnalysisOverlayProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card overflow-hidden",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Analysis</span>
        </div>
        {analysis && <ConfidenceMeter confidence={analysis.confidence} />}
      </div>

      {/* Content */}
      <div className="p-4">
        {isLoading ? (
          <LoadingState />
        ) : analysis ? (
          <div className="space-y-4">
            {/* Sentiment & Summary row */}
            <div className="flex items-start gap-4">
              <SentimentIndicator sentiment={analysis.sentiment} />
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-relaxed text-foreground/90">
                  {analysis.summary || "Analysis complete. Market signals detected."}
                </p>
              </div>
            </div>

            {/* Entities */}
            {analysis.entities.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Detected Entities
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.entities.map((entity, idx) => (
                    <EntityChip key={`${entity.name}-${idx}`} entity={entity} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Markets */}
            {analysis.suggestedQueries.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-1.5">
                  <Search className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Market Queries
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {analysis.suggestedQueries.map((query, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1.5 bg-primary/5 border-primary/20 hover:bg-primary/10 hover:border-primary/30"
                      onClick={() => onQueryClick?.(query)}
                    >
                      <Search className="h-3 w-3" />
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}

function SentimentIndicator({
  sentiment,
}: {
  sentiment: "bullish" | "bearish" | "neutral";
}) {
  const config = {
    bullish: {
      icon: TrendingUp,
      label: "Bullish",
      bgClass: "bg-chart-4/15",
      textClass: "text-chart-4",
      borderClass: "border-chart-4/30",
    },
    bearish: {
      icon: TrendingDown,
      label: "Bearish",
      bgClass: "bg-destructive/15",
      textClass: "text-destructive",
      borderClass: "border-destructive/30",
    },
    neutral: {
      icon: Minus,
      label: "Neutral",
      bgClass: "bg-muted",
      textClass: "text-muted-foreground",
      borderClass: "border-border",
    },
  };

  const { icon: Icon, label, bgClass, textClass, borderClass } = config[sentiment];

  return (
    <div
      className={cn(
        "flex items-center gap-2 px-3 py-1.5 rounded-lg border shrink-0",
        bgClass,
        borderClass
      )}
    >
      <Icon className={cn("h-4 w-4", textClass)} />
      <span className={cn("text-sm font-medium", textClass)}>{label}</span>
    </div>
  );
}

function EntityChip({ entity }: { entity: ExtractedEntity }) {
  const typeConfig: Record<string, { bg: string; text: string }> = {
    team: { bg: "bg-chart-1/15", text: "text-chart-1" },
    candidate: { bg: "bg-chart-5/15", text: "text-chart-5" },
    event: { bg: "bg-chart-2/15", text: "text-chart-2" },
    company: { bg: "bg-chart-4/15", text: "text-chart-4" },
    other: { bg: "bg-muted", text: "text-muted-foreground" },
  };

  const { bg, text } = typeConfig[entity.type] || typeConfig.other;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium",
        bg,
        text
      )}
    >
      {entity.name}
      {entity.relevance >= 0.8 && (
        <span className="opacity-60">•</span>
      )}
    </span>
  );
}

function ConfidenceMeter({ confidence }: { confidence: number }) {
  const percentage = Math.round(confidence * 100);
  const barColor =
    percentage >= 70
      ? "bg-chart-4"
      : percentage >= 40
      ? "bg-chart-2"
      : "bg-destructive";

  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-xs font-mono text-muted-foreground tabular-nums">
        {percentage}%
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center gap-3 py-4">
      <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Loader2 className="h-5 w-5 text-primary animate-spin" />
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">Processing transcript</p>
        <p className="text-xs text-muted-foreground">
          Analyzing for market signals...
        </p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse"
            style={{ animationDelay: `${i * 200}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center gap-4 py-6">
      <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center">
        <Lightbulb className="h-5 w-5 text-muted-foreground/50" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Awaiting analysis</p>
        <p className="text-xs text-muted-foreground/60 mt-0.5">
          Triggers automatically after ~30s of speech
        </p>
      </div>
    </div>
  );
}
