/**
 * useFrameStream — subscribes to ws://relay:8420/ws/frames
 * and exposes the latest frame as a data URL ready for <img src>.
 */
"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const RELAY_WS = process.env.NEXT_PUBLIC_RELAY_WS_URL || "ws://localhost:8420";

export function useFrameStream() {
    const wsRef = useRef<WebSocket | null>(null);
    const [frameUrl, setFrameUrl] = useState<string | null>(null);
    const [connected, setConnected] = useState(false);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(`${RELAY_WS}/ws/frames`);
        wsRef.current = ws;

        ws.onopen = () => setConnected(true);
        ws.onclose = () => setConnected(false);
        ws.onerror = () => setConnected(false);

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data as string);
                if (msg.type === "frame" && msg.data) {
                    // Relay sends base64 JPEG — convert to data URL
                    setFrameUrl(`data:image/jpeg;base64,${msg.data}`);
                }
            } catch {
                // ignore malformed messages
            }
        };
    }, []);

    const disconnect = useCallback(() => {
        wsRef.current?.close();
        wsRef.current = null;
        setConnected(false);
        setFrameUrl(null);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            wsRef.current?.close();
        };
    }, []);

    return { frameUrl, connected, connect, disconnect };
}
