"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Play, Square, Wifi, WifiOff } from "lucide-react";
import type { ConnectionState } from "@/lib/types/polymarket-stream";

interface VideoControlBarProps {
  isStreaming: boolean;
  useMockStream: boolean;
  connectionState: ConnectionState;
  bufferChars?: number;
  bufferThreshold?: number;
  onToggleStream: () => void;
  onToggleMock: () => void;
  className?: string;
}

export function VideoControlBar({
  isStreaming,
  useMockStream,
  connectionState,
  bufferChars = 0,
  bufferThreshold = 600,
  onToggleStream,
  onToggleMock,
  className,
}: VideoControlBarProps) {
  const isConnected = connectionState === "connected";
  const bufferPercent = Math.min((bufferChars / bufferThreshold) * 100, 100);

  return (
    <div
      className={cn(
        "flex items-center justify-between px-4 py-3 bg-card/90 backdrop-blur-md border-t border-border/30",
        className
      )}
    >
      {/* Left: Mode toggle & Connection */}
      <div className="flex items-center gap-4">
        {/* Mock/Live toggle */}
        <button
          onClick={onToggleMock}
          disabled={isStreaming}
          className={cn(
            "px-4 py-2 text-sm font-bold tracking-wider rounded-lg border transition-all",
            useMockStream
              ? "border-chart-2/50 bg-chart-2/10 text-chart-2"
              : "border-chart-4/50 bg-chart-4/10 text-chart-4",
            isStreaming
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-opacity-20"
          )}
        >
          {useMockStream ? "MOCK" : "LIVE"}
        </button>

        {/* Connection status */}
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Wifi className="h-4 w-4 text-chart-4" />
          ) : (
            <WifiOff className="h-4 w-4 text-muted-foreground" />
          )}
          <span
            className={cn(
              "text-xs font-mono uppercase",
              isConnected ? "text-chart-4" : "text-muted-foreground"
            )}
          >
            {connectionState}
          </span>
        </div>
      </div>

      {/* Center: Buffer progress */}
      {isStreaming && (
        <div className="flex-1 max-w-xs mx-8">
          <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
            <span>BUFFER</span>
            <span>
              {bufferChars}/{bufferThreshold}
            </span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-chart-1 to-chart-4 transition-all duration-300"
              style={{ width: `${bufferPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Right: Start/Stop */}
      <Button
        size="lg"
        onClick={onToggleStream}
        className={cn(
          "px-6 text-sm font-bold tracking-wider",
          isStreaming
            ? "bg-destructive hover:bg-destructive/90"
            : "bg-chart-4 hover:bg-chart-4/90 text-background"
        )}
      >
        {isStreaming ? (
          <>
            <Square className="h-4 w-4 mr-2" />
            STOP
          </>
        ) : (
          <>
            <Play className="h-4 w-4 mr-2" />
            START
          </>
        )}
      </Button>
    </div>
  );
}
