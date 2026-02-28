"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { PolymarketStream } from "@/lib/services/polymarketStream";
import type {
  PolymarketMessage,
  PolymarketAnalysis,
  PolymarketMarket,
  ConnectionState,
} from "@/lib/types/polymarket-stream";

interface UsePolymarketStreamReturn {
  state: ConnectionState;
  analysis: PolymarketAnalysis | null;
  markets: PolymarketMarket[];
  buffering: { chars: number; threshold: number } | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  sendTranscript: (text: string) => void;
}

export function usePolymarketStream(): UsePolymarketStreamReturn {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [analysis, setAnalysis] = useState<PolymarketAnalysis | null>(null);
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [buffering, setBuffering] = useState<{ chars: number; threshold: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<PolymarketStream | null>(null);

  const handleMessage = useCallback((msg: PolymarketMessage) => {
    switch (msg.type) {
      case "buffering":
        setBuffering({ chars: msg.chars, threshold: msg.threshold });
        break;
      case "analysis":
        setAnalysis(msg.data);
        setBuffering(null);
        break;
      case "markets":
        setMarkets(msg.data.markets);
        setBuffering(null);
        break;
      case "error":
        setError(msg.message);
        break;
      case "stopped":
        setBuffering(null);
        break;
    }
  }, []);

  const handleStateChange = useCallback((newState: ConnectionState) => {
    setState(newState);
    if (newState === "error") {
      setError("Connection error");
    } else if (newState === "connected") {
      setError(null);
    }
  }, []);

  const connect = useCallback(() => {
    if (!streamRef.current) {
      streamRef.current = new PolymarketStream({
        onMessage: handleMessage,
        onStateChange: handleStateChange,
      });
    }
    streamRef.current.connect();
  }, [handleMessage, handleStateChange]);

  const disconnect = useCallback(() => {
    streamRef.current?.disconnect();
  }, []);

  const sendTranscript = useCallback((text: string) => {
    streamRef.current?.sendTranscript(text);
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.disconnect();
      streamRef.current = null;
    };
  }, []);

  return {
    state,
    analysis,
    markets,
    buffering,
    error,
    connect,
    disconnect,
    sendTranscript,
  };
}
