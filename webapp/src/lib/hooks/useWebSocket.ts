"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import type { WSMessage, WSMessageType, WSPayload } from "../websocket/types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (payload: any) => void;
type Handlers = Map<WSMessageType, Set<Handler>>;

const WS_URL =
  typeof window !== "undefined"
    ? `ws://${window.location.hostname}:${window.location.port}/ws`
    : "";

const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 16000]; // exponential backoff

export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const handlersRef = useRef<Handlers>(new Map());
  const reconnectAttemptRef = useRef(0);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      console.log("[WS] Connected");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data) as WSMessage;
        const handlers = handlersRef.current.get(message.type);
        if (handlers) {
          handlers.forEach((handler) => handler(message.payload));
        }
      } catch {
        console.error("[WS] Failed to parse message");
      }
    };

    ws.onclose = () => {
      setIsConnected(false);
      wsRef.current = null;
      console.log("[WS] Disconnected");

      // Auto-reconnect with exponential backoff
      const delay =
        RECONNECT_DELAYS[
          Math.min(reconnectAttemptRef.current, RECONNECT_DELAYS.length - 1)
        ];
      reconnectAttemptRef.current++;
      reconnectTimeoutRef.current = setTimeout(connect, delay);
      console.log(`[WS] Reconnecting in ${delay}ms...`);
    };

    ws.onerror = (err) => {
      console.error("[WS] Error:", err);
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      wsRef.current?.close();
    };
  }, [connect]);

  const send = useCallback((msg: WSMessage) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    } else {
      console.warn("[WS] Cannot send, not connected");
    }
  }, []);

  const subscribe = useCallback(
    <T extends WSMessageType>(
      type: T,
      handler: (payload: WSPayload<T>) => void
    ): (() => void) => {
      if (!handlersRef.current.has(type)) {
        handlersRef.current.set(type, new Set());
      }
      handlersRef.current.get(type)!.add(handler);

      return () => {
        handlersRef.current.get(type)?.delete(handler);
      };
    },
    []
  );

  return { isConnected, send, subscribe };
}
