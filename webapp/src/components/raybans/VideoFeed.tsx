"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface VideoFeedProps {
  frameUrl?: string;
  isConnected?: boolean;
  isMock?: boolean;
  onFullscreenToggle?: () => void;
  className?: string;
}

export function VideoFeed({
  frameUrl,
  isConnected = false,
  isMock = true,
  onFullscreenToggle,
  className,
}: VideoFeedProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleFullscreenToggle = useCallback(() => {
    setIsFullscreen(!isFullscreen);
    onFullscreenToggle?.();
  }, [isFullscreen, onFullscreenToggle]);

  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Video Feed</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"}>
              <span
                className={cn(
                  "mr-1.5 h-2 w-2 rounded-full",
                  isConnected ? "bg-green-400 animate-pulse" : "bg-gray-400"
                )}
              />
              {isConnected ? "Live" : "Disconnected"}
            </Badge>
            {isMock && (
              <Badge variant="outline" className="text-xs">
                Mock
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-2">
        <div
          className={cn(
            "relative aspect-video bg-muted rounded-lg overflow-hidden",
            isFullscreen && "fixed inset-0 z-50 rounded-none"
          )}
        >
          {frameUrl && !imageError ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={frameUrl}
              src={frameUrl}
              alt="Ray-Bans video feed"
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <svg
                className="w-16 h-16 mb-2 opacity-50"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              <span className="text-sm">
                {isMock ? "Mock Mode - No Video Feed" : "Waiting for video..."}
              </span>
            </div>
          )}

          {/* Connection indicator overlay */}
          <div className="absolute top-2 left-2">
            <div
              className={cn(
                "w-3 h-3 rounded-full",
                isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
              )}
            />
          </div>

          {/* Fullscreen toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="absolute bottom-2 right-2 bg-black/50 hover:bg-black/70 text-white"
            onClick={handleFullscreenToggle}
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
