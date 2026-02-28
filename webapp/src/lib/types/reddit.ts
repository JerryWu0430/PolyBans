// Reddit types - Phase 2
export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  author: string;
  subreddit: string;
  score: number;
  numComments: number;
  createdUtc: number;
  url: string;
  permalink: string;
}

export interface SentimentResult {
  sentiment: "bullish" | "bearish" | "neutral";
  score: number; // -1 to 1
  postCount: number;
  sources: string[];
}
