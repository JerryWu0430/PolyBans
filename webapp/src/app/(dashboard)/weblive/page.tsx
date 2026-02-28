"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  PlatformSelector,
  StreamInput,
  StreamPlayer,
  TranscriptPanel,
  AnalysisOverlay,
  ArbitrageList,
} from "@/components/weblive";
import { useStreamStore, useRecentTranscript } from "@/lib/stores/streamStore";
import { startMockStream } from "@/lib/mock/mockStream";
import type { StreamPlatform } from "@/lib/types/stream";

export default function WebLivePage() {
  const [platform, setPlatform] = useState<Exclude<StreamPlatform, "raybans">>("youtube");
  const [streamId, setStreamId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const appendTranscript = useStreamStore((s) => s.appendTranscript);
  const setAnalysis = useStreamStore((s) => s.setAnalysis);
  const reset = useStreamStore((s) => s.reset);
  const recentTranscript = useRecentTranscript(5);

  const stopRef = useRef<(() => void) | null>(null);
  const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopRef.current?.();
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, []);

  // Trigger analysis when transcript accumulates
  useEffect(() => {
    if (!recentTranscript || !isStreaming) return;

    // Debounce analysis calls
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    analysisTimeoutRef.current = setTimeout(async () => {
      setIsAnalyzing(true);
      try {
        const response = await fetch("/api/analysis/mistral", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: recentTranscript }),
        });

        if (response.ok) {
          const text = await response.text();
          try {
            const result = JSON.parse(text);
            setAnalysis(result);
          } catch {
            // Streaming response, parse last line
            const lines = text.trim().split("\n");
            const lastLine = lines[lines.length - 1];
            if (lastLine) {
              const result = JSON.parse(lastLine);
              setAnalysis(result);
            }
          }
        }
      } catch (error) {
        console.error("Analysis failed:", error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 5000); // Wait 5s of transcript before analyzing
  }, [recentTranscript, isStreaming, setAnalysis]);

  const handleStreamLoad = useCallback((id: string) => {
    setStreamId(id);
  }, []);

  const handleStartMock = useCallback(() => {
    reset();
    setIsStreaming(true);

    stopRef.current = startMockStream({
      intervalMs: 3000,
      onChunk: appendTranscript,
      onEnd: () => setIsStreaming(false),
    });
  }, [appendTranscript, reset]);

  const handleStopMock = useCallback(() => {
    stopRef.current?.();
    stopRef.current = null;
    setIsStreaming(false);
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Web Live Mode</h1>

      {/* Platform Selector */}
      <PlatformSelector value={platform} onChange={setPlatform} />

      {/* Stream Input */}
      <StreamInput
        platform={platform}
        onSubmit={handleStreamLoad}
        disabled={isStreaming}
      />

      {/* Main Content Grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: Stream Player */}
        <StreamPlayer platform={platform} streamId={streamId} />

        {/* Right: Transcript */}
        <TranscriptPanel
          isStreaming={isStreaming}
          onStartMock={handleStartMock}
          onStopMock={handleStopMock}
        />
      </div>

      {/* Analysis Section */}
      <AnalysisOverlay isAnalyzing={isAnalyzing} />

      {/* Arbitrage List */}
      <ArbitrageList />
    </div>
  );
}
