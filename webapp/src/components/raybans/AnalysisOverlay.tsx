"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
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
    <Card className={cn("", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Analysis</CardTitle>
          {analysis && (
            <ConfidenceIndicator confidence={analysis.confidence} />
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <LoadingState />
        ) : analysis ? (
          <>
            {/* Sentiment & Summary */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <SentimentBadge sentiment={analysis.sentiment} />
                <span className="text-xs text-muted-foreground">
                  {(analysis.confidence * 100).toFixed(0)}% confidence
                </span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {analysis.summary}
              </p>
            </div>

            {/* Extracted Entities */}
            {analysis.entities.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Entities
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.entities.map((entity, idx) => (
                    <EntityBadge key={`${entity.name}-${idx}`} entity={entity} />
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Queries */}
            {analysis.suggestedQueries.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Suggested Markets
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {analysis.suggestedQueries.map((query, idx) => (
                    <Button
                      key={idx}
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => onQueryClick?.(query)}
                    >
                      {query}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <EmptyState />
        )}
      </CardContent>
    </Card>
  );
}

function SentimentBadge({
  sentiment,
}: {
  sentiment: "bullish" | "bearish" | "neutral";
}) {
  const config = {
    bullish: {
      variant: "default" as const,
      className: "bg-green-600 hover:bg-green-600",
      icon: "trending-up",
    },
    bearish: {
      variant: "destructive" as const,
      className: "",
      icon: "trending-down",
    },
    neutral: {
      variant: "secondary" as const,
      className: "",
      icon: "minus",
    },
  };

  const { variant, className, icon } = config[sentiment];

  return (
    <Badge variant={variant} className={className}>
      {icon === "trending-up" && (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      )}
      {icon === "trending-down" && (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
        </svg>
      )}
      {icon === "minus" && (
        <svg className="w-3 h-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
        </svg>
      )}
      {sentiment.charAt(0).toUpperCase() + sentiment.slice(1)}
    </Badge>
  );
}

function EntityBadge({ entity }: { entity: ExtractedEntity }) {
  const typeColors: Record<string, string> = {
    team: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    candidate: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    event: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
    company: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    other: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  };

  const colorClass = typeColors[entity.type] || typeColors.other;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        colorClass
      )}
      title={`Relevance: ${(entity.relevance * 100).toFixed(0)}%`}
    >
      {entity.name}
      {entity.relevance >= 0.8 && (
        <span className="ml-1 text-[10px] opacity-60">*</span>
      )}
    </span>
  );
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  const percentage = confidence * 100;
  const color =
    percentage >= 70 ? "bg-green-500" : percentage >= 40 ? "bg-yellow-500" : "bg-red-500";

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all", color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground font-mono">
        {percentage.toFixed(0)}%
      </span>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        <span className="text-sm text-muted-foreground">Analyzing transcript...</span>
      </div>
      <div className="space-y-2">
        <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-8 text-center">
      <svg
        className="w-12 h-12 text-muted-foreground/30 mb-2"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
        />
      </svg>
      <p className="text-sm text-muted-foreground">
        Waiting for enough transcript to analyze...
      </p>
      <p className="text-xs text-muted-foreground/60 mt-1">
        Analysis triggers every ~30s of speech
      </p>
    </div>
  );
}
