import { NextRequest, NextResponse } from "next/server";
import { getMarkets, getMarket, searchMarkets } from "@/lib/services";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const query = searchParams.get("q");
  const limit = searchParams.get("limit");
  const offset = searchParams.get("offset");
  const category = searchParams.get("category");

  try {
    // Single market by ID
    if (id) {
      const market = await getMarket(id);
      return NextResponse.json(market);
    }

    // Search markets
    if (query) {
      const markets = await searchMarkets(query);
      return NextResponse.json(markets);
    }

    // List markets with pagination
    const markets = await getMarkets({
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      category: category ?? undefined,
    });

    return NextResponse.json(markets);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
