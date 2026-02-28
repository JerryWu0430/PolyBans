"use client";

import { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { TranscriptChunk } from "@/lib/types/stream";

// Keywords to highlight (teams, candidates, scores, etc.)
const HIGHLIGHT_KEYWORDS = [
  // Sports teams
  "Lakers", "Warriors", "Chiefs", "Eagles", "Dodgers", "Celtics",
  "Real Madrid", "Manchester City", "Barcelona",
  // Players
  "LeBron", "Curry", "Mahomes", "Ohtani", "Mbappe", "Haaland",
  // Political terms
  "election", "polls", "vote", "campaign", "candidate", "Congress",
  "Senate", "House", "president", "Supreme Court",
  // Numbers/scores
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

  // Auto-scroll to bottom when new chunks arrive
  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [chunks, autoScroll]);

  const displayChunks = chunks.slice(-maxChunks);

  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader className="pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Transcript</CardTitle>
          <Badge variant="secondary" className="text-xs">
            {chunks.length} chunks
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-2">
        <div
          ref={scrollRef}
          className="h-full overflow-y-auto space-y-2 pr-2 scrollbar-thin"
        >
          {displayChunks.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Waiting for transcript...
            </div>
          ) : (
            displayChunks.map((chunk, idx) => (
              <TranscriptChunkItem
                key={`${chunk.timestamp}-${idx}`}
                chunk={chunk}
              />
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function TranscriptChunkItem({ chunk }: { chunk: TranscriptChunk }) {
  const timestamp = new Date(chunk.timestamp).toLocaleTimeString();
  const highlightedText = highlightKeywords(chunk.text);

  return (
    <div className="group rounded-lg bg-muted/50 p-2 hover:bg-muted transition-colors">
      <div className="flex items-start gap-2">
        <span className="text-[10px] text-muted-foreground font-mono shrink-0 pt-0.5">
          {timestamp}
        </span>
        <div className="flex-1 min-w-0">
          {chunk.speaker && (
            <span className="text-xs font-medium text-primary mr-1.5">
              {chunk.speaker}:
            </span>
          )}
          <span
            className="text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: highlightedText }}
          />
        </div>
      </div>
    </div>
  );
}

function highlightKeywords(text: string): string {
  let result = escapeHtml(text);

  for (const keyword of HIGHLIGHT_KEYWORDS) {
    if (keyword instanceof RegExp) {
      result = result.replace(
        keyword,
        (match) => `<mark class="bg-yellow-200/50 dark:bg-yellow-900/50 px-0.5 rounded">${match}</mark>`
      );
    } else {
      const regex = new RegExp(`\\b(${keyword})\\b`, "gi");
      result = result.replace(
        regex,
        `<mark class="bg-yellow-200/50 dark:bg-yellow-900/50 px-0.5 rounded">$1</mark>`
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
