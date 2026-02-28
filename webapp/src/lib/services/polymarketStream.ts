/**
 * polymarketStream.ts — WS client for polymarket:3001/api/stream
 */

import type { PolymarketMessage, ConnectionState } from "@/lib/types/polymarket-stream";

export interface PolymarketStreamOptions {
  url?: string;
  onMessage?: (msg: PolymarketMessage) => void;
  onStateChange?: (state: ConnectionState) => void;
  maxRetries?: number;
  baseDelay?: number;
}

const DEFAULT_URL = process.env.NEXT_PUBLIC_POLYMARKET_STREAM_URL || "ws://localhost:3001/api/stream";
const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_BASE_DELAY = 1000;

export class PolymarketStream {
  private ws: WebSocket | null = null;
  private url: string;
  private onMessage: (msg: PolymarketMessage) => void;
  private onStateChange: (state: ConnectionState) => void;
  private maxRetries: number;
  private baseDelay: number;
  private retryCount = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isClosing = false;

  constructor(options: PolymarketStreamOptions = {}) {
    this.url = options.url || DEFAULT_URL;
    this.onMessage = options.onMessage || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelay = options.baseDelay ?? DEFAULT_BASE_DELAY;
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;

    this.isClosing = false;
    this.onStateChange("connecting");

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.retryCount = 0;
        this.onStateChange("connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as PolymarketMessage;
          this.onMessage(msg);
        } catch {
          console.error("[polymarketStream] Invalid JSON:", event.data);
        }
      };

      this.ws.onclose = () => {
        if (!this.isClosing) {
          this.onStateChange("disconnected");
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = () => {
        this.onStateChange("error");
      };
    } catch (err) {
      console.error("[polymarketStream] Connection error:", err);
      this.onStateChange("error");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isClosing || this.retryCount >= this.maxRetries) return;

    const delay = this.baseDelay * Math.pow(2, this.retryCount);
    this.retryCount++;

    this.reconnectTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  disconnect(): void {
    this.isClosing = true;

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }

    this.onStateChange("disconnected");
  }

  get state(): ConnectionState {
    if (!this.ws) return "disconnected";
    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      default:
        return "disconnected";
    }
  }

  /**
   * Send a transcript chunk to polymarket for analysis
   */
  sendTranscript(text: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type: "transcript", text }));
    }
  }
}
