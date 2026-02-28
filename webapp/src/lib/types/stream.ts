// Stream types - Phase 2
export type StreamPlatform = "youtube" | "twitch" | "x" | "raybans";

export interface StreamSource {
  platform: StreamPlatform;
  url?: string;
  streamId?: string;
}

// Platform URL patterns for validation
export const PLATFORM_PATTERNS: Record<Exclude<StreamPlatform, "raybans">, RegExp[]> = {
  youtube: [
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/,
    /youtu\.be\/([a-zA-Z0-9_-]+)/,
    /youtube\.com\/live\/([a-zA-Z0-9_-]+)/,
  ],
  twitch: [/twitch\.tv\/([a-zA-Z0-9_]+)/],
  x: [
    /twitter\.com\/i\/broadcasts\/([a-zA-Z0-9]+)/,
    /x\.com\/i\/broadcasts\/([a-zA-Z0-9]+)/,
  ],
};

// Extract stream ID from URL
export function parseStreamUrl(url: string): { platform: StreamPlatform; streamId: string } | null {
  for (const [platform, patterns] of Object.entries(PLATFORM_PATTERNS)) {
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) {
        return { platform: platform as StreamPlatform, streamId: match[1] };
      }
    }
  }
  return null;
}

export interface TranscriptChunk {
  text: string;
  timestamp: number;
  speaker?: string;
}
