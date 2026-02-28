"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface VisionState {
  description: string | null;
  isProcessing: boolean;
  error: string | null;
  lastUpdated: number | null;
}

interface UseVisionSummaryOptions {
  intervalMs?: number;
  enabled?: boolean;
}

/**
 * Periodically sends frames to /api/vision and returns scene descriptions.
 */
export function useVisionSummary(
  frameUrl: string | null | undefined,
  options: UseVisionSummaryOptions = {}
) {
  const { intervalMs = 5000, enabled = true } = options;

  const [state, setState] = useState<VisionState>({
    description: null,
    isProcessing: false,
    error: null,
    lastUpdated: null,
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const analyze = useCallback(async (frame: string) => {
    // Abort any in-flight request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState((s) => ({ ...s, isProcessing: true, error: null }));

    try {
      const res = await fetch("/api/vision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ frame }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Vision API error");
      }

      const data = await res.json();
      setState({
        description: data.description || null,
        isProcessing: false,
        error: null,
        lastUpdated: Date.now(),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setState((s) => ({
        ...s,
        isProcessing: false,
        error: err instanceof Error ? err.message : "Unknown error",
      }));
    }
  }, []);

  useEffect(() => {
    if (!enabled || !frameUrl) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Immediate first analysis
    analyze(frameUrl);

    // Set up interval
    intervalRef.current = setInterval(() => {
      if (frameUrl) analyze(frameUrl);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      abortRef.current?.abort();
    };
  }, [enabled, frameUrl, intervalMs, analyze]);

  const reset = useCallback(() => {
    setState({
      description: null,
      isProcessing: false,
      error: null,
      lastUpdated: null,
    });
  }, []);

  return {
    ...state,
    reset,
  };
}
