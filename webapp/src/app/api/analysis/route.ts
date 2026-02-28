import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/services/mistral";
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
    }

    return NextResponse.json({ analysis, markets });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[api/analysis] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
