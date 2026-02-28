import { NextRequest, NextResponse } from "next/server";
import { analyze, analyzeStrategy } from "@/lib/services/mistral";
import { fetchMarkets } from "@/lib/services/polymarketSearch";

interface AnalysisRequest {
  transcript: string;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AnalysisRequest;

    if (!body.transcript || typeof body.transcript !== "string") {
      return NextResponse.json(
        { error: "transcript is required" },
        { status: 400 }
      );
    }

    const analysis = await analyze(body.transcript);

    let markets: Awaited<ReturnType<typeof fetchMarkets>> = [];
    if (analysis.detected && analysis.queries.length > 0) {
      markets = await fetchMarkets(analysis.queries, analysis.tag);

      // Run strategic analysis on top market
      if (markets.length > 0) {
        const topMarket = markets[0];
        const marketData = {
          title: topMarket.title,
          outcomes: topMarket.subMarkets.map((sm) => ({
            name: sm.groupItemTitle,
            probability: sm.yesPrice,
            volume: parseFloat(sm.volume) || 0,
          })),
        };

        // Only run if we have outcomes
        if (marketData.outcomes.length > 0) {
          const strategy = await analyzeStrategy(body.transcript, marketData);
          if (strategy) {
            analysis.strategy = strategy;
          }
        }
      }
    }

    return NextResponse.json({ analysis, markets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/analysis] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
