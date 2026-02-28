"use client";

import { cn } from "@/lib/utils";
import { Eye, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface VisionSummaryOverlayProps {
  description: string | null;
  isProcessing?: boolean;
  error?: string | null;
  lastUpdated?: number | null;
  isMock?: boolean;
  isStreaming?: boolean;
  className?: string;
}

export function VisionSummaryOverlay({
  description,
  isProcessing = false,
  error,
  lastUpdated,
  isMock = false,
  isStreaming = false,
  className,
}: VisionSummaryOverlayProps) {
  const timeSince = lastUpdated
    ? Math.floor((Date.now() - lastUpdated) / 1000)
    : null;

  // Determine placeholder text based on state
  const getPlaceholderText = () => {
    if (!isStreaming) return "Start stream to analyze";
    if (isMock) return "Mock mode — no real frames";
    if (isProcessing) return "Analyzing scene...";
    return "Awaiting frame...";
  };

  return (
    <div
      className={cn(
        "absolute left-3 bottom-16 w-1/4 min-w-[200px] max-w-[300px]",
        className
      )}
    >
      <div className="rounded-lg border border-border/50 bg-background/80 backdrop-blur-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-1.5 bg-muted/50 border-b border-border/30">
          <div className="flex items-center gap-1.5">
            <Eye className={cn("h-3 w-3", isMock ? "text-muted-foreground" : "text-primary")} />
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Vision
            </span>
            {isMock && (
              <span className="text-[9px] font-mono text-muted-foreground/50">
                (mock)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {isProcessing && !isMock && (
              <Loader2 className="h-3 w-3 text-primary animate-spin" />
            )}
            {timeSince !== null && !isProcessing && (
              <span className="text-[9px] font-mono text-muted-foreground/70">
                {timeSince}s ago
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="px-3 py-2">
          <AnimatePresence mode="wait">
            {error ? (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-destructive"
              >
                {error}
              </motion.p>
            ) : description ? (
              <motion.p
                key={description}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="text-xs leading-relaxed text-foreground/90"
              >
                {description}
              </motion.p>
            ) : (
              <motion.p
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-xs text-muted-foreground/70 italic"
              >
                {getPlaceholderText()}
              </motion.p>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
