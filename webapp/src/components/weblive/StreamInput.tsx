"use client";

import { useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { parseStreamUrl, type StreamPlatform } from "@/lib/types/stream";

interface StreamInputProps {
  platform: Exclude<StreamPlatform, "raybans">;
  onSubmit: (streamId: string) => void;
  disabled?: boolean;
}

const PLACEHOLDERS: Record<Exclude<StreamPlatform, "raybans">, string> = {
  youtube: "https://youtube.com/watch?v=... or https://youtu.be/...",
  twitch: "https://twitch.tv/channel_name",
  x: "https://x.com/i/broadcasts/...",
};

export function StreamInput({ platform, onSubmit, disabled }: StreamInputProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    setError(null);

    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    const parsed = parseStreamUrl(url);

    if (!parsed) {
      setError("Invalid URL format");
      return;
    }

    if (parsed.platform !== platform) {
      setError(`This is a ${parsed.platform} URL. Switch to ${parsed.platform} or enter a ${platform} URL.`);
      return;
    }

    onSubmit(parsed.streamId);
  }, [url, platform, onSubmit]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Input
          type="url"
          placeholder={PLACEHOLDERS[platform]}
          value={url}
          onChange={(e) => {
            setUrl(e.target.value);
            setError(null);
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          disabled={disabled}
          aria-invalid={!!error}
          className="flex-1"
        />
        <Button onClick={handleSubmit} disabled={disabled || !url.trim()}>
          Load
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
