"use client";

import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Video, Maximize2, Minimize2, Circle } from "lucide-react";

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
      <CardHeader className="py-2 px-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Video Feed</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant={isConnected ? "default" : "secondary"} className="gap-1.5">
              <Circle
                className={cn(
                  "h-2 w-2",
                  isConnected
                    ? "fill-green-400 text-green-400 animate-pulse"
                    : "fill-gray-400 text-gray-400"
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
      <CardContent className="p-0">
        <div
          className={cn(
            "relative aspect-video bg-muted overflow-hidden",
            isFullscreen && "fixed inset-0 z-50"
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
              <Video className="h-12 w-12 mb-2 opacity-40" strokeWidth={1.5} />
              <span className="text-sm">
                {isMock ? "Mock Mode - No Video Feed" : "Waiting for video..."}
              </span>
            </div>
          )}

          {/* Connection indicator overlay */}
          <div className="absolute top-2 left-2">
            <Circle
              className={cn(
                "h-3 w-3",
                isConnected
                  ? "fill-green-500 text-green-500 animate-pulse"
                  : "fill-red-500 text-red-500"
              )}
            />
          </div>

          {/* Fullscreen toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute bottom-2 right-2 h-8 w-8 bg-black/50 hover:bg-black/70 text-white"
            onClick={handleFullscreenToggle}
          >
            {isFullscreen ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
