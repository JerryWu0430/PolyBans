"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { StreamPlatform } from "@/lib/types/stream";

interface StreamPlayerProps {
  platform: Exclude<StreamPlatform, "raybans">;
  streamId: string | null;
  isLoading?: boolean;
}

function getEmbedUrl(platform: Exclude<StreamPlatform, "raybans">, streamId: string): string {
  switch (platform) {
    case "youtube":
      return `https://www.youtube.com/embed/${streamId}?autoplay=1`;
    case "twitch":
      // parent must match the domain where embed is hosted
      return `https://player.twitch.tv/?channel=${streamId}&parent=localhost`;
    case "x":
      // X/Twitter broadcasts have limited embed support
      return `https://platform.twitter.com/embed/Tweet.html?id=${streamId}`;
  }
}

export function StreamPlayer({ platform, streamId, isLoading }: StreamPlayerProps) {
  if (isLoading) {
    return (
      <div className="aspect-video w-full">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!streamId) {
    return (
      <div className="aspect-video w-full flex items-center justify-center bg-muted rounded-lg border">
        <p className="text-muted-foreground">
          Enter a stream URL above to start watching
        </p>
      </div>
    );
  }

  return (
    <div className="aspect-video w-full overflow-hidden rounded-lg border bg-black">
      <iframe
        src={getEmbedUrl(platform, streamId)}
        className="h-full w-full"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        title={`${platform} stream`}
      />
    </div>
  );
}
