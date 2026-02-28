// Arbitrage utility functions - Phase 5
import type { ArbitrageOpp } from "../websocket/types";

/**
 * Calculate spread between Polymarket odds and LLM prediction
 * @param polymarketOdds - Current market odds (0-1)
 * @param llmPrediction - LLM predicted probability (0-1)
 * @returns Absolute spread as decimal (0-1)
 */
export function calculateSpread(
  polymarketOdds: number,
  llmPrediction: number
): number {
  return Math.abs(polymarketOdds - llmPrediction);
}

/**
 * Score an arbitrage opportunity based on multiple factors
 * Higher score = better opportunity
 * @param spread - Price spread (0-1)
 * @param sentiment - Sentiment alignment score (0-1)
 * @param confidence - Confidence in the prediction (0-1)
 * @returns Weighted score (0-100)
 */
export function scoreOpportunity(
  spread: number,
  sentiment: number,
  confidence: number
): number {
  // Weights: spread 50%, sentiment 20%, confidence 30%
  const spreadWeight = 0.5;
  const sentimentWeight = 0.2;
  const confidenceWeight = 0.3;

  const score =
    spread * spreadWeight * 100 +
    sentiment * sentimentWeight * 100 +
    confidence * confidenceWeight * 100;

  return Math.min(100, Math.round(score * 2)); // Scale up since max raw is 50
}

/**
 * Rank opportunities by composite score
 * @param opps - Array of arbitrage opportunities
 * @returns Sorted array (highest score first)
 */
export function rankOpportunities(opps: ArbitrageOpp[]): ArbitrageOpp[] {
  return [...opps].sort((a, b) => {
    // Primary: spread (higher = better)
    // Secondary: confidence (higher = better)
    // Tertiary: timestamp (newer = better)
    const scoreA = a.spread * 100 + a.confidence * 10;
    const scoreB = b.spread * 100 + b.confidence * 10;
    if (scoreA !== scoreB) return scoreB - scoreA;
    return b.timestamp - a.timestamp;
  });
}

/**
 * Format spread as percentage string
 */
export function formatSpread(spread: number): string {
  return `${(spread * 100).toFixed(1)}%`;
}

/**
 * Format odds as cents (e.g., "65¢")
 */
export function formatOdds(odds: number): string {
  return `${Math.round(odds * 100)}¢`;
}

/**
 * Determine suggested position based on prediction vs market
 */
export function getSuggestedPosition(
  marketOdds: number,
  prediction: number
): "YES" | "NO" {
  return prediction > marketOdds ? "YES" : "NO";
}

/**
 * Get color class based on spread value
 */
export function getSpreadColorClass(spread: number): string {
  if (spread >= 0.1) return "text-green-500";
  if (spread >= 0.05) return "text-green-400";
  if (spread >= 0.03) return "text-yellow-500";
  return "text-muted-foreground";
}

/**
 * Filter opportunities by minimum thresholds
 */
export function filterOpportunities(
  opps: ArbitrageOpp[],
  minSpread: number,
  minConfidence: number
): ArbitrageOpp[] {
  return opps.filter(
    (opp) => opp.spread >= minSpread && opp.confidence >= minConfidence
  );
}
