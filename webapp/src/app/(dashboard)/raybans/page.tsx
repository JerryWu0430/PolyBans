"use client";

import { useEffect, useCallback, useState } from "react";
import { useStreamStore } from "@/lib/stores/streamStore";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { useAnalysisPipeline } from "@/lib/hooks/useAnalysisPipeline";
import { useRelayStream } from "@/lib/hooks/useRelayStream";
import { startMockStream } from "@/lib/mockStream";
import { VideoFeed } from "@/components/raybans/VideoFeed";
import { TranscriptOverlay } from "@/components/raybans/TranscriptOverlay";
import { MarketsSidebar } from "@/components/raybans/MarketsSidebar";
import { VideoControlBar } from "@/components/raybans/VideoControlBar";
import { MarketOrderModal } from "@/components/raybans/MarketOrderModal";
import { Glasses, Clock, Zap } from "lucide-react";
import type { TranscriptChunk } from "@/lib/types/stream";

export default function RayBansPage() {
  const {
    transcript,
    setAnalysis,
    setConnected,
    setMode,
    appendTranscript,
    reset,
  } = useStreamStore();

  const {
    clearOpportunities,
    streamedMarkets,
  } = useArbitrageStore();

  const {
    buffering,
    analysis,
    error: pipelineError,
    isProcessing,
    sendTranscript,
    reset: resetPipeline,
  } = useAnalysisPipeline();

  const {
    state: relayState,
    transcripts: relayTranscripts,
    connect: connectRelay,
    disconnect: disconnectRelay,
  } = useRelayStream({ channel: "transcript" });

  const [isStreaming, setIsStreaming] = useState(false);
  const [useMockStream, setUseMockStream] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Live clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync analysis to streamStore
  useEffect(() => {
    if (analysis?.detected) {
      setAnalysis({
        confidence: 0.8,
        sentiment: "neutral",
        summary: analysis.reason,
        suggestedQueries: analysis.queries,
        entities: analysis.queries.map((q: string) => ({
          name: q,
          type: "other" as const,
          relevance: 0.8,
        })),
      });
    }
  }, [analysis, setAnalysis]);

  // Relay transcripts → append + send to pipeline
  useEffect(() => {
    if (!useMockStream && relayTranscripts.length > 0) {
      const latest = relayTranscripts[relayTranscripts.length - 1];
      appendTranscript({
        text: latest.text,
        timestamp: latest.timestamp,
        speaker: latest.source,
      });
      sendTranscript(latest.text);
    }
  }, [useMockStream, relayTranscripts, appendTranscript, sendTranscript]);

  const handleChunk = useCallback(
    (chunk: TranscriptChunk) => {
      appendTranscript(chunk);
      sendTranscript(chunk.text);
    },
    [appendTranscript, sendTranscript]
  );

  const toggleStream = useCallback(() => {
    if (isStreaming) {
      setIsStreaming(false);
      setConnected(false);
      disconnectRelay();
      resetPipeline();
    } else {
      setMode("raybans");
      setConnected(true);
      setIsStreaming(true);
      if (!useMockStream) {
        connectRelay();
      }
    }
  }, [
    isStreaming,
    useMockStream,
    setConnected,
    setMode,
    connectRelay,
    disconnectRelay,
    resetPipeline,
  ]);

  // Mock stream
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
      resetPipeline();
    };
  }, [reset, clearOpportunities, resetPipeline]);

  const isLiveConnected = isStreaming || relayState === "connected";
  const connectionState = isStreaming ? "connected" : "disconnected";
  const bufferPercent = buffering
    ? Math.min((buffering.chars / buffering.threshold) * 100, 100)
    : 0;

  return (
    <>
    <div className="h-full flex flex-col bg-background">
      {/* Top Status Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-card/50">
        <div className="flex items-center gap-6">
          {/* Branding */}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 border border-primary/30 flex items-center justify-center">
              <Glasses className="h-4 w-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-bold tracking-wider text-primary">POLYBANS</span>
              <span className="text-[10px] text-muted-foreground font-mono">RAY-BANS MODE</span>
            </div>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className={`flex items-center gap-1.5 ${isLiveConnected ? "text-chart-4" : "text-muted-foreground"}`}>
              <div className={`w-1.5 h-1.5 rounded-full ${isLiveConnected ? "bg-chart-4 animate-pulse" : "bg-muted-foreground/50"}`} />
              <span>{isProcessing ? "ANALYZING" : isStreaming ? "STREAMING" : "IDLE"}</span>
            </div>
            <div className="text-muted-foreground">
              BUFFER: <span className={buffering ? "text-chart-2" : "text-muted-foreground/50"}>{buffering?.chars ?? 0}/{buffering?.threshold ?? 600}</span>
            </div>
          </div>
        </div>

        {/* Right side - clock */}
        <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
          <Clock className="h-3 w-3" />
          <span suppressHydrationWarning>{currentTime.toLocaleTimeString("en-US", { hour12: false })}</span>
        </div>
      </div>

      {/* Error Banner */}
      {pipelineError && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs font-mono flex items-center gap-2">
          <Zap className="h-3 w-3" />
          ERROR: {pipelineError}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left: Video Feed with Overlay */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Video + Transcript Overlay */}
          <div className="flex-1 relative min-h-0">
            <VideoFeed
              isConnected={isLiveConnected}
              isMock={useMockStream}
              className="absolute inset-0 rounded-none border-0"
            />
            <TranscriptOverlay
              chunks={transcript}
              bufferPercent={bufferPercent}
              isStreaming={isStreaming}
            />
          </div>

          {/* Control Bar */}
          <VideoControlBar
            isStreaming={isStreaming}
            useMockStream={useMockStream}
            connectionState={connectionState}
            bufferChars={buffering?.chars}
            bufferThreshold={buffering?.threshold}
            onToggleStream={toggleStream}
            onToggleMock={() => setUseMockStream(!useMockStream)}
          />
        </div>

        {/* Right: Markets Sidebar */}
        <MarketsSidebar
          markets={streamedMarkets}
          isStreaming={isStreaming}
        />
      </div>
    </div>

    {/* Modal rendered outside page container for proper centering */}
    <MarketOrderModal />
    </>
  );
}
