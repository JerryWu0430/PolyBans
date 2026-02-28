"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp, ChevronDown, MessageSquare, Clock } from "lucide-react";
import type { TranscriptChunk } from "@/lib/types/stream";

interface TranscriptOverlayProps {
  chunks: TranscriptChunk[];
  livePartial?: { text: string; timestamp: number; speaker?: string } | null;
  bufferPercent?: number;
  isStreaming?: boolean;
  className?: string;
}

export function TranscriptOverlay({
  chunks,
  livePartial = null,
  bufferPercent = 0,
  isStreaming = false,
  className,
}: TranscriptOverlayProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll when expanded
  useEffect(() => {
    if (isExpanded && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, isExpanded]);

  const latestChunks = chunks.slice(-2);
  const allChunks = chunks.slice(-50);

  return (
    <div
      className={cn(
        "absolute bottom-0 left-0 right-0 transition-all duration-300 ease-out",
        isExpanded ? "top-0" : "",
        className
      )}
    >
      {/* Backdrop for expanded state */}
      {isExpanded && (
        <div
          className="absolute inset-0 bg-background/60 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Overlay container */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 transition-all duration-300",
          isExpanded
            ? "top-4 mx-4 rounded-xl border border-border/50"
            : "mx-3 mb-3 rounded-lg"
        )}
      >
        {/* Main content */}
        <div
          className={cn(
            "bg-card/90 backdrop-blur-md overflow-hidden",
            isExpanded ? "rounded-xl h-full flex flex-col" : "rounded-lg"
          )}
        >
          {/* Header / Collapse toggle */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 hover:bg-muted/30 transition-colors",
              isExpanded && "border-b border-border/30"
            )}
          >
            <div className="flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold tracking-wider">TRANSCRIPT</span>
              <span className="text-[10px] font-mono text-muted-foreground">
                {chunks.length} chunks
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground">
                {isExpanded ? "Collapse" : "View all"}
              </span>
              {isExpanded ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>

          {/* Collapsed: Latest 1-2 lines + live partial */}
          {!isExpanded && (
            <div className="px-3 py-2 space-y-1 max-h-24 overflow-hidden">
              {latestChunks.length === 0 && !livePartial ? (
                <p className="text-xs text-muted-foreground/60 italic">
                  {isStreaming ? "Listening..." : "Start stream to capture audio"}
                </p>
              ) : (
                <>
                  {latestChunks.map((chunk, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground/70 shrink-0 pt-0.5">
                        {formatTime(chunk.timestamp)}
                      </span>
                      <p className="text-xs text-foreground/90 leading-relaxed line-clamp-1">
                        {chunk.speaker && (
                          <span className="font-semibold text-primary mr-1">{chunk.speaker}:</span>
                        )}
                        {chunk.text}
                      </p>
                    </div>
                  ))}
                  {livePartial && (
                    <div className="flex items-start gap-2 opacity-70">
                      <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 pt-0.5">
                        {formatTime(livePartial.timestamp)}
                      </span>
                      <p className="text-xs text-foreground/70 leading-relaxed line-clamp-1 italic">
                        {livePartial.text}<span className="animate-pulse">▋</span>
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Expanded: Full transcript */}
          {isExpanded && (
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto scrollbar-terminal p-3 space-y-1"
            >
              {allChunks.length === 0 && !livePartial ? (
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="w-12 h-12 rounded-xl bg-muted/50 border border-border/50 flex items-center justify-center mb-3">
                    <MessageSquare className="h-5 w-5 text-muted-foreground/50" />
                  </div>
                  <p className="text-sm text-muted-foreground">Awaiting transcript</p>
                  <p className="text-xs text-muted-foreground/60 mt-0.5">
                    Speech will appear here
                  </p>
                </div>
              ) : (
                <>
                  {allChunks.map((chunk, idx) => (
                    <div
                      key={`${chunk.timestamp}-${idx}`}
                      className={cn(
                        "group flex gap-3 px-3 py-2 rounded-lg transition-colors",
                        idx === allChunks.length - 1 && !livePartial
                          ? "bg-primary/5 border border-primary/10"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                          {formatTime(chunk.timestamp)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        {chunk.speaker && (
                          <span className="text-xs font-semibold text-primary mr-1.5">
                            {chunk.speaker}:
                          </span>
                        )}
                        <span className="text-sm leading-relaxed">{chunk.text}</span>
                      </div>
                    </div>
                  ))}
                  {livePartial && (
                    <div className="group flex gap-3 px-3 py-2 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <Clock className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
                          {formatTime(livePartial.timestamp)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 opacity-75">
                        <span className="text-sm leading-relaxed italic">{livePartial.text}</span>
                        <span className="animate-pulse ml-0.5">▋</span>
                      </div>
                      <div className="shrink-0 pt-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Buffer progress bar (collapsed only) */}
          {!isExpanded && isStreaming && (
            <div className="px-3 pb-2">
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-chart-1 to-chart-4 transition-all duration-300"
                  style={{ width: `${bufferPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}
