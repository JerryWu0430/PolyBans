"use client";

import { useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useStreamStore } from "@/lib/stores/streamStore";
import { cn } from "@/lib/utils";

interface TranscriptPanelProps {
  isStreaming: boolean;
  onStartMock: () => void;
  onStopMock: () => void;
}

export function TranscriptPanel({ isStreaming, onStartMock, onStopMock }: TranscriptPanelProps) {
  const transcript = useStreamStore((s) => s.transcript);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new chunks
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [transcript]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-base">Transcript</CardTitle>
        <div className="flex items-center gap-2">
          {isStreaming && (
            <Badge variant="default" className="animate-pulse">
              Live
            </Badge>
          )}
          <Button
            size="sm"
            variant={isStreaming ? "destructive" : "default"}
            onClick={isStreaming ? onStopMock : onStartMock}
          >
            {isStreaming ? "Stop" : "Start Mock"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full max-h-[400px] overflow-y-auto space-y-2 pr-2"
        >
          {transcript.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Transcript will appear here when stream starts...
            </p>
          ) : (
            transcript.map((chunk, i) => (
              <div
                key={i}
                className={cn(
                  "text-sm p-2 rounded-md",
                  i % 2 === 0 ? "bg-muted" : "bg-muted/50"
                )}
              >
                <span className="text-muted-foreground text-xs">
                  {new Date(chunk.timestamp).toLocaleTimeString()}
                  {chunk.speaker && ` - ${chunk.speaker}`}
                </span>
                <p className="mt-0.5">{chunk.text}</p>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
