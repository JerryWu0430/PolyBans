"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chunks]);

  const allChunks = chunks.slice(-50);

  return (
    <div
      className={cn(
        "absolute right-3 w-1/5 min-w-[220px] group/transcript",
        "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
        isExpanded ? "top-12 bottom-3" : "top-12 h-36",
        className
      )}
    >
      {/* Terminal container */}
      <div
        className={cn(
          "h-full flex flex-col rounded-xl border border-border/50 overflow-hidden",
          "bg-[#0d1117] backdrop-blur-md",
          "transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]",
          isExpanded
            ? "shadow-xl shadow-black/30 opacity-100"
            : "opacity-60 hover:opacity-100 group-hover/transcript:opacity-100"
        )}
      >
        {/* Terminal header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-border/30 hover:bg-[#1c2128] transition-all duration-200 active:scale-[0.99]"
        >
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#27ca40]" />
            </div>
            <span className="text-[10px] font-mono text-[#8b949e] ml-2">transcript</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-mono text-[#8b949e]">
              {chunks.length}
            </span>
            <ChevronUp
              className={cn(
                "h-3 w-3 text-[#8b949e] transition-transform duration-300",
                isExpanded && "rotate-180"
              )}
            />
          </div>
        </button>

        {/* Terminal content */}
        <ScrollArea className="flex-1 min-h-0 relative">
          {/* Bottom fade for collapsed */}
          {!isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[#0d1117] to-transparent z-10 pointer-events-none" />
          )}

          <div className="p-3 font-mono text-xs">
            <AnimatePresence mode="popLayout">
              {allChunks.length === 0 && !livePartial ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-[#8b949e]"
                >
                  <span className="text-[#7ee787]">$</span>{" "}
                  {isStreaming ? (
                    <span className="text-[#8b949e]">
                      listening<span className="animate-pulse">...</span>
                    </span>
                  ) : (
                    "awaiting stream"
                  )}
                </motion.div>
              ) : (
                <div className="space-y-1.5">
                  {allChunks.map((chunk, idx) => (
                    <motion.div
                      key={`${chunk.timestamp}-${idx}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, ease: "easeOut" }}
                      className={cn(
                        "leading-relaxed",
                        idx >= allChunks.length - 2
                          ? "text-[#c9d1d9]"
                          : "text-[#8b949e]"
                      )}
                    >
                      <span className="text-[#7ee787]">{">"}</span>{" "}
                      {chunk.text}
                    </motion.div>
                  ))}
                  {livePartial && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[#58a6ff]"
                    >
                      <span className="text-[#7ee787]">{">"}</span>{" "}
                      {livePartial.text}
                      <span className="animate-pulse ml-0.5 text-[#7ee787]">▋</span>
                    </motion.div>
                  )}
                </div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>
        </ScrollArea>

        {/* Buffer progress bar */}
        {isStreaming && (
          <div className="px-3 py-2 border-t border-border/20 bg-[#161b22]">
            <div className="h-1 bg-[#21262d] rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#238636] to-[#7ee787]"
                initial={{ width: 0 }}
                animate={{ width: `${bufferPercent}%` }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
