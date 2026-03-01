"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Video, Maximize2, Minimize2, Wifi, WifiOff } from "lucide-react";

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
    <div
      className={cn(
        "relative flex flex-col rounded-xl border border-border/50 bg-card overflow-hidden",
        className
      )}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30">
        <div className="flex items-center gap-2">
          <Video className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Video Feed</span>
        </div>
        <div className="flex items-center gap-2">
          {/* Status indicator */}
          <div
            className={cn(
              "flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium",
              isConnected
                ? "bg-chart-4/15 text-chart-4"
                : "bg-muted text-muted-foreground"
            )}
          >
            {isConnected ? (
              <>
                <Wifi className="h-3 w-3" />
                <span>Live</span>
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                <span>Offline</span>
              </>
            )}
          </div>
          {isMock && (
            <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wide bg-accent/50 text-accent-foreground">
              Mock
            </span>
          )}
        </div>
      </div>

      {/* Video area - fills container (aspect ratio handled by parent) */}
      <div
        className={cn(
          "relative flex-1 min-h-0 bg-muted/30 overflow-hidden",
          isFullscreen && "fixed inset-0 z-50 bg-black flex items-center justify-center"
        )}
      >
        {frameUrl && !imageError ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={frameUrl}
            alt="Ray-Bans video feed"
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {/* Decorative grid pattern */}
            <div
              className="absolute inset-0 opacity-[0.03]"
              style={{
                backgroundImage: `
                  linear-gradient(to right, currentColor 1px, transparent 1px),
                  linear-gradient(to bottom, currentColor 1px, transparent 1px)
                `,
                backgroundSize: "24px 24px",
              }}
            />

            {/* Centered content */}
            <div className="relative flex flex-col items-center gap-3">
              <div className="w-16 h-16 rounded-2xl bg-muted/80 border border-border/50 flex items-center justify-center">
                <Video className="h-7 w-7 text-muted-foreground/50" strokeWidth={1.5} />
              </div>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {isMock ? "Mock Mode Active" : "Awaiting Feed"}
                </p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {isMock ? "Video stream simulated" : "Connect your device"}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Live indicator overlay */}
        {isConnected && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse-live" />
            <span className="text-[10px] font-mono text-white/90 uppercase tracking-wider">
              REC
            </span>
          </div>
        )}

        {/* Fullscreen toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute bottom-3 right-3 h-8 w-8 bg-black/40 hover:bg-black/60 text-white/80 hover:text-white backdrop-blur-sm border border-white/10"
          onClick={handleFullscreenToggle}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
