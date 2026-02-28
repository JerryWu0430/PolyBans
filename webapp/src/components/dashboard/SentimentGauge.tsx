"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useStreamStore } from "@/lib/stores/streamStore";
import { MessageSquare, TrendingUp, TrendingDown, Minus, Clock } from "lucide-react";

interface SentimentGaugeProps {
  sentiment?: "bullish" | "bearish" | "neutral";
  score?: number; // -1 to 1
  postCount?: number;
  lastUpdated?: number;
}

export function SentimentGauge({
  sentiment: propSentiment,
  score: propScore,
  postCount: propPostCount,
  lastUpdated: propLastUpdated,
}: SentimentGaugeProps) {
  // Use analysis from stream store if not provided via props
  const analysis = useStreamStore((s) => s.currentAnalysis);

  const sentiment = propSentiment ?? analysis?.sentiment ?? "neutral";
  // Convert confidence (0-1) to score (-1 to 1) based on sentiment
  const score =
    propScore ??
    (analysis
      ? sentiment === "bullish"
        ? analysis.confidence
        : sentiment === "bearish"
          ? -analysis.confidence
          : 0
      : 0);
  const postCount = propPostCount ?? 0;
  const lastUpdated = propLastUpdated ?? Date.now();

  // Calculate gauge position (0-100)
  const gaugePosition = ((score + 1) / 2) * 100;

  // Sentiment colors
  const sentimentConfig = {
    bullish: {
      color: "text-green-500",
      bgColor: "bg-green-500",
      label: "Bullish",
      icon: <TrendingUp className="h-4 w-4" />,
    },
    bearish: {
      color: "text-red-500",
      bgColor: "bg-red-500",
      label: "Bearish",
      icon: <TrendingDown className="h-4 w-4" />,
    },
    neutral: {
      color: "text-yellow-500",
      bgColor: "bg-yellow-500",
      label: "Neutral",
      icon: <Minus className="h-4 w-4" />,
    },
  };

  const config = sentimentConfig[sentiment];

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Reddit Sentiment
          </CardTitle>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              sentiment === "bullish"
                ? "bg-green-500/10 text-green-600 border-green-500/20"
                : sentiment === "bearish"
                  ? "bg-red-500/10 text-red-600 border-red-500/20"
                  : "bg-yellow-500/10 text-yellow-600 border-yellow-500/20"
            )}
          >
            {config.icon}
            <span className="ml-1">{config.label}</span>
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Circular gauge */}
        <div className="flex justify-center">
          <div className="relative w-32 h-16 overflow-hidden">
            {/* Background arc */}
            <svg
              viewBox="0 0 100 50"
              className="w-full h-full"
              style={{ transform: "rotate(-90deg)" }}
            >
              {/* Gradient definition */}
              <defs>
                <linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#eab308" />
                  <stop offset="100%" stopColor="#22c55e" />
                </linearGradient>
              </defs>

              {/* Background track */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-muted"
                strokeLinecap="round"
              />

              {/* Colored arc */}
              <path
                d="M 10 50 A 40 40 0 0 1 90 50"
                fill="none"
                stroke="url(#gaugeGradient)"
                strokeWidth="8"
                strokeLinecap="round"
                opacity="0.3"
              />
            </svg>

            {/* Needle indicator */}
            <div
              className="absolute bottom-0 left-1/2 origin-bottom transition-transform duration-500"
              style={{
                transform: `translateX(-50%) rotate(${(gaugePosition - 50) * 1.8}deg)`,
              }}
            >
              <div className={cn("w-1 h-12 rounded-full", config.bgColor)} />
              <div className={cn("w-3 h-3 rounded-full -mt-1 -ml-1", config.bgColor)} />
            </div>

            {/* Center pivot */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-background border-2 border-muted" />
          </div>
        </div>

        {/* Linear gauge (alternative visualization) */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Bearish</span>
            <span>Neutral</span>
            <span>Bullish</span>
          </div>
          <div className="relative h-3 bg-muted rounded-full overflow-hidden">
            {/* Gradient background */}
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(to right, #ef4444, #eab308, #22c55e)",
                opacity: 0.2,
              }}
            />

            {/* Position indicator */}
            <div
              className="absolute top-0 bottom-0 w-1 bg-foreground rounded-full transition-all duration-500"
              style={{ left: `calc(${gaugePosition}% - 2px)` }}
            />
          </div>
        </div>

        {/* Score display */}
        <div className="flex items-center justify-center">
          <span className={cn("text-2xl font-bold font-mono", config.color)}>
            {score >= 0 ? "+" : ""}
            {(score * 100).toFixed(0)}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-2 border-t text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <MessageSquare className="h-3 w-3" />
            {postCount} posts analyzed
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {new Date(lastUpdated).toLocaleTimeString()}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
