import type { RedditPost, SentimentResult } from "@/lib/types";

const SENTIMENT_SUBREDDITS = ["polymarket", "wallstreetbets"];

export async function getSubredditPosts(
  subreddit: string,
  limit = 25
): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/r/${subreddit}.json?limit=${limit}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PolyBans/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch r/${subreddit}: ${res.status}`);
  }

  const data = await res.json();
  return data.data.children.map(mapRedditPost);
}

export async function searchPosts(query: string): Promise<RedditPost[]> {
  const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&limit=25`;
  const res = await fetch(url, {
    headers: { "User-Agent": "PolyBans/1.0" },
  });

  if (!res.ok) {
    throw new Error(`Failed to search Reddit: ${res.status}`);
  }

  const data = await res.json();
  return data.data.children.map(mapRedditPost);
}

export async function getSentiment(query: string): Promise<SentimentResult> {
  // Aggregate posts from sentiment-relevant subreddits
  const allPosts: RedditPost[] = [];

  for (const subreddit of SENTIMENT_SUBREDDITS) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=1&limit=10`;
      const res = await fetch(url, {
        headers: { "User-Agent": "PolyBans/1.0" },
      });

      if (res.ok) {
        const data = await res.json();
        const posts = data.data.children.map(mapRedditPost);
        allPosts.push(...posts);
      }
    } catch {
      // Continue on individual subreddit failures
    }
  }

  if (allPosts.length === 0) {
    return {
      sentiment: "neutral",
      score: 0,
      postCount: 0,
      sources: [],
    };
  }

  // Simple sentiment analysis based on keywords and scores
  let bullishScore = 0;
  let bearishScore = 0;

  const bullishWords = [
    "bull",
    "moon",
    "pump",
    "buy",
    "long",
    "calls",
    "win",
    "yes",
    "up",
  ];
  const bearishWords = [
    "bear",
    "dump",
    "sell",
    "short",
    "puts",
    "lose",
    "no",
    "down",
    "crash",
  ];

  for (const post of allPosts) {
    const text = `${post.title} ${post.selftext}`.toLowerCase();
    const scoreWeight = Math.log10(Math.max(post.score, 1) + 1);

    for (const word of bullishWords) {
      if (text.includes(word)) bullishScore += scoreWeight;
    }
    for (const word of bearishWords) {
      if (text.includes(word)) bearishScore += scoreWeight;
    }
  }

  const total = bullishScore + bearishScore;
  const normalizedScore =
    total > 0 ? (bullishScore - bearishScore) / total : 0;

  let sentiment: "bullish" | "bearish" | "neutral";
  if (normalizedScore > 0.2) sentiment = "bullish";
  else if (normalizedScore < -0.2) sentiment = "bearish";
  else sentiment = "neutral";

  return {
    sentiment,
    score: normalizedScore,
    postCount: allPosts.length,
    sources: [...new Set(allPosts.map((p) => p.subreddit))],
  };
}

function mapRedditPost(child: { data: Record<string, unknown> }): RedditPost {
  const d = child.data;
  return {
    id: String(d.id ?? ""),
    title: String(d.title ?? ""),
    selftext: String(d.selftext ?? ""),
    author: String(d.author ?? ""),
    subreddit: String(d.subreddit ?? ""),
    score: Number(d.score ?? 0),
    numComments: Number(d.num_comments ?? 0),
    createdUtc: Number(d.created_utc ?? 0),
    url: String(d.url ?? ""),
    permalink: `https://reddit.com${d.permalink ?? ""}`,
  };
}
