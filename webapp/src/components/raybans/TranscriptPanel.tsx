"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Clock } from "lucide-react";
import type { TranscriptChunk } from "@/lib/types/stream";

const HIGHLIGHT_KEYWORDS = [
  "Lakers", "Warriors", "Chiefs", "Eagles", "Dodgers", "Celtics",
  "Real Madrid", "Manchester City", "Barcelona",
  "LeBron", "Curry", "Mahomes", "Ohtani", "Mbappe", "Haaland",
  "election", "polls", "vote", "campaign", "candidate", "Congress",
  "Senate", "House", "president", "Supreme Court",
  /\d+\s*-\s*\d+/, /\d+%/, /\d+\s*point/,
];

interface TranscriptPanelProps {
  chunks: TranscriptChunk[];
  autoScroll?: boolean;
  maxChunks?: number;
  className?: string;
}

export function TranscriptPanel({
  chunks,
  autoScroll = true,
  maxChunks = 50,
  className,
}: TranscriptPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, autoScroll]);

  const displayChunks = chunks.slice(-maxChunks);

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
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Transcript</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2 py-0.5 rounded text-xs font-mono bg-muted text-muted-foreground tabular-nums">
            {chunks.length}
          </span>
        </div>
      </div>

      {/* Transcript content */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-terminal p-3 space-y-1"
      >
        {displayChunks.length === 0 ? (
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
          displayChunks.map((chunk, idx) => (
            <TranscriptChunkItem
              key={`${chunk.timestamp}-${idx}`}
              chunk={chunk}
              isLatest={idx === displayChunks.length - 1}
            />
          ))
        )}
      </div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent pointer-events-none" />
    </div>
  );
}

function TranscriptChunkItem({
  chunk,
  isLatest,
}: {
  chunk: TranscriptChunk;
  isLatest?: boolean;
}) {
  const timestamp = new Date(chunk.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const highlightedText = highlightKeywords(chunk.text);

  return (
    <div
      className={cn(
        "group flex gap-3 px-3 py-2 rounded-lg transition-colors",
        isLatest
          ? "bg-primary/5 border border-primary/10"
          : "hover:bg-muted/50"
      )}
    >
      {/* Timestamp */}
      <div className="flex items-center gap-1 shrink-0 pt-0.5">
        <Clock className="h-3 w-3 text-muted-foreground/50" />
        <span className="text-[10px] font-mono text-muted-foreground/70 tabular-nums">
          {timestamp}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {chunk.speaker && (
          <span className="text-xs font-semibold text-primary mr-1.5">
            {chunk.speaker}:
          </span>
        )}
        <span
          className="text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: highlightedText }}
        />
      </div>

      {/* Live indicator for latest */}
      {isLatest && (
        <div className="shrink-0 pt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-live" />
        </div>
      )}
    </div>
  );
}

function highlightKeywords(text: string): string {
  let result = escapeHtml(text);

  for (const keyword of HIGHLIGHT_KEYWORDS) {
    if (keyword instanceof RegExp) {
      result = result.replace(
        keyword,
        (match) =>
          `<mark class="bg-accent/60 text-accent-foreground px-1 py-0.5 rounded font-medium">${match}</mark>`
      );
    } else {
      const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
      result = result.replace(
        regex,
        `<mark class="bg-accent/60 text-accent-foreground px-1 py-0.5 rounded font-medium">$1</mark>`
      );
    }
  }

  return result;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
