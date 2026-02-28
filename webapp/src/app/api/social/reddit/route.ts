import { NextRequest, NextResponse } from "next/server";
import { getSentiment, getSubredditPosts, searchPosts } from "@/lib/services";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");
  const subreddit = searchParams.get("subreddit");
  const limit = searchParams.get("limit");

  try {
    // Sentiment aggregation (default mode)
    if (query && !subreddit) {
      const sentiment = await getSentiment(query);
      return NextResponse.json(sentiment);
    }

    // Specific subreddit posts
    if (subreddit) {
      const posts = await getSubredditPosts(
        subreddit,
        limit ? parseInt(limit, 10) : 25
      );
      return NextResponse.json(posts);
    }

    // Search across Reddit
    if (query) {
      const posts = await searchPosts(query);
      return NextResponse.json(posts);
    }

    return NextResponse.json(
      { error: "q or subreddit param required" },
      { status: 400 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
