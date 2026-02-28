"use client";

import { useEffect, useCallback, useState } from "react";
import { useStreamStore } from "@/lib/stores/streamStore";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { startMockStream } from "@/lib/mockStream";
import { analyzeTranscript } from "@/lib/services/mistral";
import {
  VideoFeed,
  TranscriptPanel,
  AnalysisOverlay,
  ArbitrageList,
} from "@/components/raybans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TranscriptChunk } from "@/lib/types/stream";

// How many characters to accumulate before triggering analysis
const ANALYSIS_CHAR_THRESHOLD = 300;
// Minimum interval between analyses (ms)
const ANALYSIS_INTERVAL = 30000;

export default function RayBansPage() {
  const {
    transcript,
    currentAnalysis,
    isConnected,
    appendTranscript,
    setAnalysis,
    setConnected,
    setMode,
    reset,
  } = useStreamStore();

  const { opportunities, addOpportunity, clearOpportunities } =
    useArbitrageStore();

  const [isStreaming, setIsStreaming] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalysisTime, setLastAnalysisTime] = useState(0);
  const [charsSinceAnalysis, setCharsSinceAnalysis] = useState(0);

  // Handle transcript chunk arrival
  const handleChunk = useCallback(
    (chunk: TranscriptChunk) => {
      appendTranscript(chunk);
      setCharsSinceAnalysis((prev) => prev + chunk.text.length);
    },
    [appendTranscript]
  );

  const runAnalysis = useCallback(async () => {
    if (isAnalyzing) return;

    setIsAnalyzing(true);
    setCharsSinceAnalysis(0);
    setLastAnalysisTime(Date.now());

    try {
      // Get recent transcript text
      const recentText = transcript
        .slice(-20)
        .map((c) => c.text)
        .join(" ");

      const result = await analyzeTranscript(recentText);
      setAnalysis(result);

      // If high confidence, create mock arbitrage opportunity
      if (result.confidence >= 0.6 && result.entities.length > 0) {
        const mockOpp = createMockOpportunity(result);
        if (mockOpp) {
          addOpportunity(mockOpp);
        }
      }
    } catch (error) {
      console.error("Analysis failed:", error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, transcript, setAnalysis, addOpportunity]);

  // Trigger analysis when threshold reached
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastAnalysis = now - lastAnalysisTime;

    if (
      charsSinceAnalysis >= ANALYSIS_CHAR_THRESHOLD &&
      timeSinceLastAnalysis >= ANALYSIS_INTERVAL &&
      !isAnalyzing &&
      transcript.length > 0
    ) {
      runAnalysis();
    }
  }, [charsSinceAnalysis, lastAnalysisTime, isAnalyzing, transcript.length, runAnalysis]);

  // Start/stop mock stream
  const toggleStream = useCallback(() => {
    if (isStreaming) {
      setIsStreaming(false);
      setConnected(false);
    } else {
      setMode("raybans");
      setConnected(true);
      setIsStreaming(true);
    }
  }, [isStreaming, setConnected, setMode]);

  // Mock stream effect
  useEffect(() => {
    if (!isStreaming) return;

    const cleanup = startMockStream(handleChunk);
    return cleanup;
  }, [isStreaming, handleChunk]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
      clearOpportunities();
    };
  }, [reset, clearOpportunities]);

  const handleQueryClick = (query: string) => {
    // TODO: Open Polymarket search with query
    console.log("Search Polymarket:", query);
  };

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Ray-Bans Mode</h1>
          <Badge variant="outline">OpenGlass Integration</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isStreaming ? "destructive" : "default"}
            onClick={toggleStream}
          >
            {isStreaming ? "Stop Stream" : "Start Mock Stream"}
          </Button>
          {isStreaming && (
            <Button variant="outline" onClick={runAnalysis} disabled={isAnalyzing}>
              {isAnalyzing ? "Analyzing..." : "Force Analysis"}
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Video Feed */}
        <VideoFeed
          isConnected={isConnected}
          isMock={true}
          className="h-[280px]"
        />

        {/* Transcript Panel */}
        <TranscriptPanel chunks={transcript} className="h-[280px]" />
      </div>

      {/* Analysis Overlay */}
      <AnalysisOverlay
        analysis={currentAnalysis}
        isLoading={isAnalyzing}
        onQueryClick={handleQueryClick}
      />

      {/* Arbitrage List */}
      <ArbitrageList opportunities={opportunities} />
    </div>
  );
}

// Helper to create mock arbitrage opportunity from analysis
function createMockOpportunity(analysis: ReturnType<typeof useStreamStore.getState>["currentAnalysis"]) {
  if (!analysis) return null;

  const entity = analysis.entities[0];
  const id = `opp-${Date.now()}`;

  return {
    id,
    marketA: {
      id: `market-a-${id}`,
      question: `Will ${entity?.name || "Event"} outcome be positive?`,
      slug: `market-a-${id}`,
      endDate: new Date(Date.now() + 86400000).toISOString(),
      liquidity: "10000",
      volume: "5000",
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.55", "0.45"],
    },
    marketB: {
      id: `market-b-${id}`,
      question: `${entity?.name || "Event"} to ${analysis.sentiment === "bullish" ? "succeed" : "decline"}?`,
      slug: `market-b-${id}`,
      endDate: new Date(Date.now() + 86400000).toISOString(),
      liquidity: "8000",
      volume: "4000",
      outcomes: ["Yes", "No"],
      outcomePrices: ["0.48", "0.52"],
    },
    spread: 0.07 + Math.random() * 0.08,
    confidence: analysis.confidence,
    timestamp: Date.now(),
  };
}
