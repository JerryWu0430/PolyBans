"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { RelayStream, RelayChannel } from "@/lib/services/relayStream";
import type { TranscriptSegment, ConnectionState } from "@/lib/types/polymarket-stream";

interface UseRelayStreamOptions {
  channel?: RelayChannel;
  maxHistory?: number;
}

interface UseRelayStreamReturn {
  state: ConnectionState;
  transcripts: TranscriptSegment[];
  latestTranscript: TranscriptSegment | null;
  connect: () => void;
  disconnect: () => void;
  clearTranscripts: () => void;
  sendTts: (text: string) => Promise<void>;
}

export function useRelayStream(options: UseRelayStreamOptions = {}): UseRelayStreamReturn {
  const { channel = "transcript", maxHistory = 50 } = options;
  const [state, setState] = useState<ConnectionState>("disconnected");
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const streamRef = useRef<RelayStream | null>(null);

  const handleTranscript = useCallback(
    (segment: TranscriptSegment) => {
      setTranscripts((prev) => {
        const updated = [...prev, segment];
        return updated.slice(-maxHistory);
      });
    },
    [maxHistory]
  );

  const handleHistory = useCallback(
    (entries: TranscriptSegment[]) => {
      setTranscripts((prev) => {
        const ids = new Set(prev.map((t) => t.id));
        const newEntries = entries.filter((e) => !ids.has(e.id));
        const updated = [...prev, ...newEntries];
        return updated.slice(-maxHistory);
      });
    },
    [maxHistory]
  );

  const handleStateChange = useCallback((newState: ConnectionState) => {
    setState(newState);
  }, []);

  const connect = useCallback(() => {
    if (!streamRef.current) {
      streamRef.current = new RelayStream({
        channel,
        onTranscript: handleTranscript,
        onHistory: handleHistory,
        onStateChange: handleStateChange,
      });
    }
    streamRef.current.connect();
  }, [channel, handleTranscript, handleHistory, handleStateChange]);

  const disconnect = useCallback(() => {
    streamRef.current?.disconnect();
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  const sendTts = useCallback(async (text: string) => {
    if (streamRef.current) {
      await streamRef.current.sendTts(text);
    }
  }, []);

  useEffect(() => {
    return () => {
      streamRef.current?.disconnect();
      streamRef.current = null;
    };
  }, []);

  const latestTranscript = transcripts.length > 0 ? transcripts[transcripts.length - 1] : null;

  return {
    state,
    transcripts,
    latestTranscript,
    connect,
    disconnect,
    clearTranscripts,
    sendTts,
  };
}
