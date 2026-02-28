"use client";

import { useState, useCallback, useRef } from "react";
import { TranscriptBuffer, MIN_CHARS_TO_PROCESS } from "@/lib/services/transcriptBuffer";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import type { PolymarketAnalysis, PolymarketMarket } from "@/lib/types/polymarket-stream";

interface AnalysisResponse {
  analysis: PolymarketAnalysis;
  markets: PolymarketMarket[];
}

interface BufferingState {
  chars: number;
  threshold: number;
}

interface UseAnalysisPipelineReturn {
  buffering: BufferingState | null;
  analysis: PolymarketAnalysis | null;
  markets: PolymarketMarket[];
  error: string | null;
  isProcessing: boolean;
  flushCount: number;
  sendTranscript: (text: string) => void;
  reset: () => void;
}

export function useAnalysisPipeline(): UseAnalysisPipelineReturn {
  const bufferRef = useRef(new TranscriptBuffer());
  const [buffering, setBuffering] = useState<BufferingState | null>(null);
  const [analysis, setAnalysis] = useState<PolymarketAnalysis | null>(null);
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [flushCount, setFlushCount] = useState(0);

  const { setStreamedMarkets, setLatestAnalysis, setBuffering: setStoreBuffering } = useArbitrageStore();

  const processAnalysis = useCallback(async (transcript: string) => {
    setIsProcessing(true);
    bufferRef.current.isProcessing = true;
    setError(null);

    try {
      const res = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Request failed" }));
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      const data: AnalysisResponse = await res.json();

      setAnalysis(data.analysis);
      setLatestAnalysis(data.analysis);

      if (data.markets.length > 0) {
        setMarkets(data.markets);
        setStreamedMarkets(data.markets);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Analysis failed";
      setError(msg);
      console.error("[useAnalysisPipeline] Error:", msg);
    } finally {
      setIsProcessing(false);
      bufferRef.current.isProcessing = false;
    }
  }, [setLatestAnalysis, setStreamedMarkets]);

  const sendTranscript = useCallback((text: string) => {
    const buffer = bufferRef.current;
    const { ready, charsBuffered } = buffer.append(text);

    const bufferState = { chars: charsBuffered, threshold: MIN_CHARS_TO_PROCESS };
    setBuffering(bufferState);
    setStoreBuffering(bufferState);

    if (ready) {
      const transcript = buffer.flush();
      // Reset display immediately after flush so UI shows 0/600
      const resetState = { chars: buffer.length, threshold: MIN_CHARS_TO_PROCESS };
      setBuffering(resetState);
      setStoreBuffering(resetState);
      setFlushCount((n) => n + 1); // signal page to clear transcript list
      processAnalysis(transcript);
    }
  }, [processAnalysis, setStoreBuffering]);

  const reset = useCallback(() => {
    bufferRef.current.reset();
    setBuffering(null);
    setAnalysis(null);
    setMarkets([]);
    setError(null);
    setIsProcessing(false);
    setStoreBuffering(null);
  }, [setStoreBuffering]);

  return {
    buffering,
    analysis,
    markets,
    error,
    isProcessing,
    flushCount,
    sendTranscript,
    reset,
  };
}
