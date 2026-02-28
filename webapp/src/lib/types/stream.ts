// Stream types - Phase 2
export interface StreamSource {
  platform: "twitch" | "youtube" | "raybans";
  url?: string;
  streamId?: string;
}

export interface TranscriptChunk {
  text: string;
  timestamp: number;
  speaker?: string;
}
