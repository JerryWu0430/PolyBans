"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { useStreamStore } from "@/lib/stores/streamStore";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { useAnalysisPipeline } from "@/lib/hooks/useAnalysisPipeline";
import { useRelayStream } from "@/lib/hooks/useRelayStream";
import { useFrameStream } from "@/lib/hooks/useFrameStream";
import { useVisionSummary } from "@/lib/hooks/useVisionSummary";
import { startMockStream } from "@/lib/mockStream";
import { useTradeConfirmation } from "@/lib/hooks/useTradeConfirmation";
import { VideoFeed } from "@/components/raybans/VideoFeed";
import { TranscriptOverlay } from "@/components/raybans/TranscriptOverlay";
import { VisionSummaryOverlay } from "@/components/raybans/VisionSummaryOverlay";
import { MarketsSidebar } from "@/components/raybans/MarketsSidebar";
import { VideoControlBar } from "@/components/raybans/VideoControlBar";
import { MarketOrderModal } from "@/components/raybans/MarketOrderModal";
import { TradeConfirmationBanner } from "@/components/raybans/TradeConfirmationBanner";
import { Glasses, Clock, Zap, Volume2 } from "lucide-react";
import { ModeToggle } from "@/components/layout/ModeToggle";
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
    markets,
    error: pipelineError,
    isProcessing,
    flushCount,
    sendTranscript,
    reset: resetPipeline,
  } = useAnalysisPipeline();

  const {
    state: relayState,
    transcripts: relayTranscripts,
    connect: connectRelay,
    disconnect: disconnectRelay,
    sendTts,
  } = useRelayStream({ channel: "transcript" });

  const {
    frameUrl,
    connect: connectFrames,
    disconnect: disconnectFrames,
  } = useFrameStream();

  const tradeConfirmation = useTradeConfirmation({ sendTts });

  const [isStreaming, setIsStreaming] = useState(false);
  const [useMockStream, setUseMockStream] = useState(true);

  // Vision analysis - only active when streaming real frames
  const {
    description: visionDescription,
    isProcessing: visionProcessing,
    error: visionError,
    lastUpdated: visionLastUpdated,
    reset: resetVision,
  } = useVisionSummary(frameUrl, {
    enabled: isStreaming && !useMockStream && !!frameUrl,
    intervalMs: 5000,
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [ttsText, setTtsText] = useState("");
  const [ttsSending, setTtsSending] = useState(false);

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

  // Trigger trade confirmation when new markets arrive
  useEffect(() => {
    if (markets.length > 0) {
      tradeConfirmation.handleNewMarkets(markets);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markets]);

  // Track previous transcript to extract only new words each 5s
  const lastTranscriptRef = useRef("");

  // Relay transcripts → append only the NEW words added since last message
  useEffect(() => {
    if (!useMockStream && relayTranscripts.length > 0) {
      const latest = relayTranscripts[relayTranscripts.length - 1];
      const prev = lastTranscriptRef.current;
      lastTranscriptRef.current = latest.text;

      // Strip the already-seen prefix to get only new words
      let delta = latest.text;
      if (prev && latest.text.startsWith(prev)) {
        delta = latest.text.slice(prev.length).trim();
      }

      if (delta) {
        appendTranscript({ text: delta, timestamp: latest.timestamp, speaker: latest.source });
        const consumed = tradeConfirmation.interceptTranscript(delta);
        if (!consumed) {
          sendTranscript(delta); // only count new words toward the 600-char buffer
        }
      }
    }
  }, [useMockStream, relayTranscripts, appendTranscript, sendTranscript]);

  // Note: We no longer clear transcript on buffer flush - transcripts accumulate

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
      disconnectFrames();
      resetPipeline();
      resetVision();
    } else {
      setMode("raybans");
      setConnected(true);
      setIsStreaming(true);
      if (!useMockStream) {
        connectRelay();
        connectFrames();
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
    resetVision,
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
      resetVision();
    };
  }, [reset, clearOpportunities, resetPipeline, resetVision]);

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

          {/* Right side - clock & controls */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
              <Clock className="h-3 w-3" />
              <span suppressHydrationWarning>{currentTime.toLocaleTimeString("en-US", { hour12: false })}</span>
            </div>
            <ModeToggle />
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
          {/* Left: Controls Sidebar */}
          <div className="w-40 shrink-0 flex flex-col border-r border-border/30 bg-card/50">
            <VideoControlBar
              isStreaming={isStreaming}
              useMockStream={useMockStream}
              connectionState={connectionState}
              bufferChars={buffering?.chars}
              bufferThreshold={buffering?.threshold}
              onToggleStream={toggleStream}
              onToggleMock={() => setUseMockStream(!useMockStream)}
              vertical
            />

            {/* TTS Input */}
            <div className="flex flex-col gap-2 p-3 border-t border-border/30">
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase">
                <Volume2 className="h-3 w-3" />
                <span>TTS</span>
              </div>
              <textarea
                value={ttsText}
                onChange={(e) => setTtsText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && ttsText.trim() && !ttsSending) {
                    e.preventDefault();
                    const text = ttsText.trim();
                    setTtsText("");
                    setTtsSending(true);
                    sendTts(text).catch(console.error).finally(() => setTtsSending(false));
                  }
                }}
                placeholder="Speak to glasses..."
                className="w-full h-20 bg-background/50 border border-border/50 rounded px-2 py-1.5 text-xs font-mono placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 resize-none"
                disabled={ttsSending}
              />
              <button
                onClick={() => {
                  if (ttsText.trim() && !ttsSending) {
                    const text = ttsText.trim();
                    setTtsText("");
                    setTtsSending(true);
                    sendTts(text).catch(console.error).finally(() => setTtsSending(false));
                  }
                }}
                disabled={!ttsText.trim() || ttsSending}
                className="w-full px-2 py-1.5 text-[10px] font-mono uppercase bg-primary/20 border border-primary/30 rounded hover:bg-primary/30 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {ttsSending ? "SENDING..." : "SEND"}
              </button>
            </div>
          </div>

          {/* Center: Video Feed with Overlay - 9:16 portrait */}
          <div className="relative h-full aspect-[9/16] shrink-0 flex flex-col">
            <div className="relative flex-1">
              <VideoFeed
                frameUrl={!useMockStream ? frameUrl ?? undefined : undefined}
                isConnected={isLiveConnected}
                isMock={useMockStream}
                className="absolute inset-0 rounded-none border-0"
              />
              <TranscriptOverlay
                chunks={transcript}
                bufferPercent={bufferPercent}
                isStreaming={isStreaming}
              />
              <VisionSummaryOverlay
                description={visionDescription}
                isProcessing={visionProcessing}
                error={visionError}
                lastUpdated={visionLastUpdated}
                isMock={useMockStream}
                isStreaming={isStreaming}
              />
            </div>
            {/* Trade Confirmation Banner */}
            {tradeConfirmation.confirmationState !== "idle" && (
              <TradeConfirmationBanner
                state={tradeConfirmation.confirmationState}
                market={tradeConfirmation.pendingMarket}
                subMarket={tradeConfirmation.pendingSubMarket}
                timeoutProgress={tradeConfirmation.timeoutProgress}
                lastTradeResult={tradeConfirmation.lastTradeResult}
                onCancel={tradeConfirmation.manualCancel}
              />
            )}
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
