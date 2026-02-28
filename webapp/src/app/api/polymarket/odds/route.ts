import { NextRequest, NextResponse } from "next/server";
import { getMarket, getOddsFromMarket } from "@/lib/services";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const marketId = searchParams.get("marketId");

  if (!marketId) {
    return NextResponse.json(
      { error: "marketId is required" },
      { status: 400 }
    );
  }

  try {
    const market = await getMarket(marketId);
    const odds = getOddsFromMarket(market);
    return NextResponse.json(odds);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
