"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { PolymarketStream } from "@/lib/services/polymarketStream";
import type {
  PolymarketMessage,
  PolymarketAnalysis,
  PolymarketMarket,
  ConnectionState,
} from "@/lib/types/polymarket-stream";

interface BufferingState {
  chars: number;
  threshold: number;
}

interface UsePolymarketStreamReturn {
  state: ConnectionState;
  analysis: PolymarketAnalysis | null;
  markets: PolymarketMarket[];
  buffering: BufferingState | null;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
}

export function usePolymarketStream(): UsePolymarketStreamReturn {
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [analysis, setAnalysis] = useState<PolymarketAnalysis | null>(null);
  const [markets, setMarkets] = useState<PolymarketMarket[]>([]);
  const [buffering, setBuffering] = useState<BufferingState | null>(null);
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
    if (newState === "connected") {
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

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      streamRef.current?.disconnect();
      streamRef.current = null;
    };
  }, [connect]);

  return {
    state,
    analysis,
    markets,
    buffering,
    error,
    connect,
    disconnect,
  };
}
