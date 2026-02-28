"use client";

import { useEffect, useCallback, useState } from "react";
import { useStreamStore } from "@/lib/stores/streamStore";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { usePolymarketStream } from "@/lib/hooks/usePolymarketStream";
import { useRelayStream } from "@/lib/hooks/useRelayStream";
import { startMockStream } from "@/lib/mockStream";
import {
  VideoFeed,
  TranscriptPanel,
  AnalysisOverlay,
  ArbitrageList,
} from "@/components/raybans";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Circle, Loader2 } from "lucide-react";
import type { TranscriptChunk } from "@/lib/types/stream";

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

  const {
    opportunities,
    addOpportunity,
    clearOpportunities,
    setStreamedMarkets,
    setLatestAnalysis,
    setBuffering,
    streamedMarkets,
  } = useArbitrageStore();

  // Polymarket WS stream (for analysis results)
  const {
    state: polymarketState,
    analysis,
    markets,
    buffering,
    error: polymarketError,
    connect: connectPolymarket,
    disconnect: disconnectPolymarket,
  } = usePolymarketStream();

  // Relay WS stream (for raw transcript)
  const {
    state: relayState,
    transcripts: relayTranscripts,
    connect: connectRelay,
    disconnect: disconnectRelay,
  } = useRelayStream({ channel: "transcript" });

  const [isStreaming, setIsStreaming] = useState(false);
  const [useMockStream, setUseMockStream] = useState(true);

  // Sync polymarket stream results to store
  useEffect(() => {
    if (analysis) {
      setLatestAnalysis(analysis);
      // Map analysis to existing format for AnalysisOverlay
      if (analysis.detected) {
        setAnalysis({
          confidence: 0.8,
          sentiment: "neutral",
          summary: analysis.reason,
          suggestedQueries: analysis.queries,
          entities: analysis.queries.map((q) => ({
            name: q,
            type: "other" as const,
            relevance: 0.8,
          })),
        });
      }
    }
  }, [analysis, setAnalysis, setLatestAnalysis]);

  useEffect(() => {
    if (markets && markets.length > 0) {
      setStreamedMarkets(markets);
    }
  }, [markets, setStreamedMarkets]);

  useEffect(() => {
    setBuffering(buffering);
  }, [buffering, setBuffering]);

  // Sync relay transcript to store (when not using mock)
  useEffect(() => {
    if (!useMockStream && relayTranscripts.length > 0) {
      const latest = relayTranscripts[relayTranscripts.length - 1];
      appendTranscript({
        text: latest.text,
        timestamp: latest.timestamp,
        speaker: latest.source,
      });
    }
  }, [useMockStream, relayTranscripts, appendTranscript]);

  // Handle mock transcript chunk
  const handleChunk = useCallback(
    (chunk: TranscriptChunk) => {
      appendTranscript(chunk);
    },
    [appendTranscript]
  );

  // Toggle stream
  const toggleStream = useCallback(() => {
    if (isStreaming) {
      setIsStreaming(false);
      setConnected(false);
      disconnectPolymarket();
      disconnectRelay();
    } else {
      setMode("raybans");
      setConnected(true);
      setIsStreaming(true);
      connectPolymarket();
      if (!useMockStream) {
        connectRelay();
      }
    }
  }, [
    isStreaming,
    useMockStream,
    setConnected,
    setMode,
    connectPolymarket,
    disconnectPolymarket,
    connectRelay,
    disconnectRelay,
  ]);

  // Mock stream effect
  useEffect(() => {
    if (!isStreaming || !useMockStream) return;
    const cleanup = startMockStream(handleChunk);
    return cleanup;
  }, [isStreaming, useMockStream, handleChunk]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      reset();
      clearOpportunities();
    };
  }, [reset, clearOpportunities]);

  const handleQueryClick = (query: string) => {
    window.open(`https://polymarket.com/markets?_q=${encodeURIComponent(query)}`, "_blank");
  };

  const isLiveConnected =
    polymarketState === "connected" || relayState === "connected";

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Ray-Bans Mode</h1>
          <Badge variant="outline">OpenGlass Integration</Badge>
          {isStreaming && (
            <Badge
              variant={isLiveConnected ? "default" : "secondary"}
              className="text-xs gap-1.5"
            >
              {polymarketState === "connected" ? (
                <>
                  <Circle className="h-2 w-2 fill-green-500 text-green-500" />
                  Live
                </>
              ) : (
                <>
                  <Loader2 className="h-3 w-3 animate-spin" />
                  Connecting
                </>
              )}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setUseMockStream(!useMockStream)}
            disabled={isStreaming}
          >
            {useMockStream ? "Mock" : "Live"}
          </Button>
          <Button
            variant={isStreaming ? "destructive" : "default"}
            onClick={toggleStream}
          >
            {isStreaming ? "Stop Stream" : "Start Stream"}
          </Button>
        </div>
      </div>

      {/* Error display */}
      {polymarketError && (
        <div className="text-sm text-red-500 bg-red-500/10 p-2 rounded">
          Stream error: {polymarketError}
        </div>
      )}

      {/* Buffering indicator */}
      {buffering && (
        <div className="text-sm text-muted-foreground">
          Buffering: {buffering.chars}/{buffering.threshold} chars
        </div>
      )}

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Video Feed */}
        <VideoFeed
          isConnected={isConnected}
          isMock={useMockStream}
          className="h-[280px]"
        />

        {/* Transcript Panel */}
        <TranscriptPanel chunks={transcript} className="h-[280px]" />
      </div>

      {/* Analysis Overlay */}
      <AnalysisOverlay
        analysis={currentAnalysis}
        isLoading={buffering !== null}
        onQueryClick={handleQueryClick}
      />

      {/* Arbitrage List */}
      <ArbitrageList opportunities={opportunities} />

      {/* Streamed Markets from WS */}
      {streamedMarkets.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Live Markets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {streamedMarkets.map((market) => (
              <div
                key={market.id}
                className="p-3 border rounded-lg space-y-2 hover:shadow-sm transition-shadow"
              >
                <div className="flex gap-2">
                  {market.image && (
                    <img
                      src={market.image}
                      alt=""
                      className="w-8 h-8 rounded object-cover"
                    />
                  )}
                  <p className="text-sm font-medium line-clamp-2">
                    {market.question || market.title}
                  </p>
                </div>
                {market.sparkline?.length > 1 && (
                  <div className="h-6 flex items-end gap-px">
                    {market.sparkline.slice(-20).map((v, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-primary/60 rounded-t"
                        style={{ height: `${v * 100}%` }}
                      />
                    ))}
                  </div>
                )}
                <a
                  href={`https://polymarket.com/event/${market.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  View on Polymarket →
                </a>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
