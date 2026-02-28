"use client";

import { useEffect, useCallback, useState } from "react";
import { useStreamStore } from "@/lib/stores/streamStore";
import { useArbitrageStore } from "@/lib/stores/arbitrageStore";
import { usePolymarketStream } from "@/lib/hooks/usePolymarketStream";
import { useRelayStream } from "@/lib/hooks/useRelayStream";
import { startMockStream } from "@/lib/mockStream";
import { Button } from "@/components/ui/button";
import {
  Play,
  Square,
  Glasses,
  Radio,
  Wifi,
  WifiOff,
  ExternalLink,
  TrendingUp,
  Activity,
  Zap,
  Clock,
  Volume2,
} from "lucide-react";
import type { TranscriptChunk } from "@/lib/types/stream";
import type { PolymarketMarket } from "@/lib/types/polymarket-stream";

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
    clearOpportunities,
    setStreamedMarkets,
    setLatestAnalysis,
    setBuffering,
    streamedMarkets,
  } = useArbitrageStore();

  const {
    state: polymarketState,
    analysis,
    markets,
    buffering,
    error: polymarketError,
    connect: connectPolymarket,
    disconnect: disconnectPolymarket,
    sendTranscript: sendToPolymarket,
  } = usePolymarketStream();

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

  useEffect(() => {
    if (analysis) {
      setLatestAnalysis(analysis);
      if (analysis.detected) {
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

  const handleChunk = useCallback(
    (chunk: TranscriptChunk) => {
      appendTranscript(chunk);
      sendToPolymarket(chunk.text);
    },
    [appendTranscript, sendToPolymarket]
  );

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

  useEffect(() => {
    if (!isStreaming || !useMockStream) return;
    const cleanup = startMockStream(handleChunk);
    return cleanup;
  }, [isStreaming, useMockStream, handleChunk]);

  useEffect(() => {
    return () => {
      reset();
      clearOpportunities();
    };
  }, [reset, clearOpportunities]);

  const isLiveConnected = polymarketState === "connected" || relayState === "connected";
  const bufferPercent = buffering ? Math.min((buffering.chars / buffering.threshold) * 100, 100) : 0;

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Top Status Bar - Bloomberg style */}
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
              <span>WS:{polymarketState.toUpperCase()}</span>
            </div>
            <div className="text-muted-foreground">
              BUFFER: <span className={buffering ? "text-chart-2" : "text-muted-foreground/50"}>{buffering?.chars ?? 0}/{buffering?.threshold ?? 600}</span>
            </div>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-3">
          {/* Live clock */}
          <div className="flex items-center gap-1.5 text-xs font-mono text-muted-foreground">
            <Clock className="h-3 w-3" />
            <span>{currentTime.toLocaleTimeString("en-US", { hour12: false })}</span>
          </div>

          {/* Mode toggle */}
          <button
            onClick={() => setUseMockStream(!useMockStream)}
            disabled={isStreaming}
            className={`px-2.5 py-1 text-[10px] font-bold tracking-wider rounded border transition-colors ${
              useMockStream
                ? "border-chart-2/50 bg-chart-2/10 text-chart-2"
                : "border-chart-4/50 bg-chart-4/10 text-chart-4"
            } ${isStreaming ? "opacity-50 cursor-not-allowed" : "hover:bg-opacity-20"}`}
          >
            {useMockStream ? "MOCK" : "LIVE"}
          </button>

          {/* Main action */}
          <Button
            size="sm"
            onClick={toggleStream}
            className={`h-7 px-4 text-xs font-bold tracking-wider ${
              isStreaming
                ? "bg-destructive hover:bg-destructive/90"
                : "bg-chart-4 hover:bg-chart-4/90 text-background"
            }`}
          >
            {isStreaming ? (
              <>
                <Square className="h-3 w-3 mr-1.5" />
                STOP
              </>
            ) : (
              <>
                <Play className="h-3 w-3 mr-1.5" />
                START
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {polymarketError && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/30 text-destructive text-xs font-mono flex items-center gap-2">
          <Zap className="h-3 w-3" />
          ERROR: {polymarketError}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Transcript Feed */}
        <div className="w-1/3 border-r border-border/50 flex flex-col bg-card/30">
          {/* Panel Header */}
          <div className="px-3 py-2 border-b border-border/30 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-2">
              <Volume2 className="h-3.5 w-3.5 text-primary" />
              <span className="text-xs font-bold tracking-wider">TRANSCRIPT</span>
            </div>
            <span className="text-[10px] font-mono text-muted-foreground">{transcript.length} CHUNKS</span>
          </div>

          {/* Transcript List */}
          <div className="flex-1 overflow-y-auto scrollbar-terminal p-2 space-y-1">
            {transcript.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground/50 text-xs">
                {isStreaming ? "Listening..." : "Start stream to capture audio"}
              </div>
            ) : (
              transcript.slice(-50).map((chunk, i) => (
                <div
                  key={i}
                  className={`px-2 py-1.5 rounded text-xs font-mono border-l-2 ${
                    i === transcript.slice(-50).length - 1
                      ? "border-l-chart-4 bg-chart-4/5"
                      : "border-l-transparent bg-muted/20"
                  }`}
                >
                  <p className="text-foreground/90 leading-relaxed">{chunk.text}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {new Date(chunk.timestamp).toLocaleTimeString("en-US", { hour12: false })}
                    {chunk.speaker && ` · ${chunk.speaker}`}
                  </p>
                </div>
              ))
            )}
          </div>

          {/* Buffer Progress */}
          {isStreaming && (
            <div className="px-3 py-2 border-t border-border/30 bg-muted/20">
              <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground mb-1">
                <span>BUFFER PROGRESS</span>
                <span>{Math.round(bufferPercent)}%</span>
              </div>
              <div className="h-1 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-chart-1 to-chart-4 transition-all duration-300"
                  style={{ width: `${bufferPercent}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Panel - Markets & Analysis */}
        <div className="flex-1 flex flex-col min-h-0">
          {/* Analysis Bar */}
          {currentAnalysis && (
            <div className="px-4 py-3 border-b border-border/30 bg-primary/5">
              <div className="flex items-start gap-3">
                <Activity className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground leading-relaxed">{currentAnalysis.summary}</p>
                  {currentAnalysis.suggestedQueries && currentAnalysis.suggestedQueries.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {currentAnalysis.suggestedQueries.map((q, i) => (
                        <a
                          key={i}
                          href={`https://polymarket.com/markets?_q=${encodeURIComponent(q)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2 py-0.5 text-[10px] font-mono bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                        >
                          {q}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Markets Grid */}
          <div className="flex-1 overflow-y-auto scrollbar-terminal p-4">
            {streamedMarkets.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50">
                <TrendingUp className="h-8 w-8 mb-3" />
                <p className="text-sm font-medium">No markets detected</p>
                <p className="text-xs mt-1">
                  {isStreaming ? "Analyzing transcript for market opportunities..." : "Start the stream to detect markets"}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Markets Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Radio className="h-4 w-4 text-chart-4" />
                    <span className="text-sm font-bold tracking-wide">LIVE MARKETS</span>
                    <span className="px-1.5 py-0.5 text-[10px] font-mono bg-chart-4/20 text-chart-4 rounded">
                      {streamedMarkets.length}
                    </span>
                  </div>
                </div>

                {/* Market Cards */}
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
                  {streamedMarkets.map((market: PolymarketMarket) => (
                    <div
                      key={market.id}
                      className="group p-4 rounded-lg border border-border/50 bg-card hover:border-primary/40 hover:bg-card/80 transition-all"
                    >
                      {/* Market Header */}
                      <div className="flex gap-3 mb-3">
                        {market.image && (
                          <img
                            src={market.image}
                            alt=""
                            className="w-12 h-12 rounded-md object-cover shrink-0 border border-border/30"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium leading-snug line-clamp-2">
                            {market.question || market.title}
                          </h3>
                          {market.volume && (
                            <p className="text-[10px] font-mono text-muted-foreground mt-1">
                              VOL: ${parseFloat(market.volume).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Outcomes */}
                      {market.markets && market.markets.length > 0 && (
                        <div className="space-y-1.5 mb-3">
                          {market.markets.slice(0, 3).map((outcome, i) => (
                            <div key={i} className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate mr-2">{outcome.outcome}</span>
                              <span className={`font-mono font-bold ${
                                outcome.price >= 0.7 ? "text-chart-4" :
                                outcome.price <= 0.3 ? "text-destructive" :
                                "text-foreground"
                              }`}>
                                {(outcome.price * 100).toFixed(0)}¢
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Sparkline */}
                      {market.sparkline && market.sparkline.length > 1 && (
                        <div className="h-8 flex items-end gap-px mb-3">
                          {market.sparkline.slice(-20).map((v: number, i: number) => (
                            <div
                              key={i}
                              className="flex-1 bg-primary/30 group-hover:bg-primary/50 rounded-sm transition-colors"
                              style={{ height: `${Math.max(v * 100, 8)}%` }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Link */}
                      <a
                        href={`https://polymarket.com/event/${market.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono text-primary hover:underline"
                      >
                        VIEW ON POLYMARKET
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
