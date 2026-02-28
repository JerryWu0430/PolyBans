"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStreamStore } from "@/lib/stores/streamStore";
import { cn } from "@/lib/utils";

interface AnalysisOverlayProps {
  isAnalyzing?: boolean;
}

const SENTIMENT_STYLES = {
  bullish: "bg-green-500/10 text-green-600 border-green-500/20",
  bearish: "bg-red-500/10 text-red-600 border-red-500/20",
  neutral: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
};

export function AnalysisOverlay({ isAnalyzing }: AnalysisOverlayProps) {
  const analysis = useStreamStore((s) => s.currentAnalysis);

  if (isAnalyzing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-16 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-20" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Analysis will appear here as the transcript is processed...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Analysis</CardTitle>
        <Badge
          variant="outline"
          className={cn("capitalize", SENTIMENT_STYLES[analysis.sentiment])}
        >
          {analysis.sentiment}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidence</span>
            <span className="font-medium">{Math.round(analysis.confidence * 100)}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${analysis.confidence * 100}%` }}
            />
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium mb-1">Summary</h4>
          <p className="text-sm text-muted-foreground">{analysis.summary}</p>
        </div>

        {analysis.entities.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Entities</h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.entities.map((entity, i) => (
                <Badge key={i} variant="secondary" className="text-xs">
                  {entity.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {analysis.suggestedQueries.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">Suggested Markets</h4>
            <div className="flex flex-wrap gap-1.5">
              {analysis.suggestedQueries.map((query, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {query}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
