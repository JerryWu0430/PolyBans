/**
 * relayStream.ts — WS client for relay-server:8420
 *
 * Handles raw transcript stream and frame data from the relay server.
 * Implements reconnection with exponential backoff.
 */

import type { RelayMessage, ConnectionState, TranscriptSegment } from "@/lib/types/polymarket-stream";

export type RelayChannel = "transcript" | "frames" | "all";

export interface RelayStreamOptions {
  baseUrl?: string;
  channel?: RelayChannel;
  onMessage?: (msg: RelayMessage) => void;
  onTranscript?: (segment: TranscriptSegment) => void;
  onHistory?: (entries: TranscriptSegment[]) => void;
  onStateChange?: (state: ConnectionState) => void;
  maxRetries?: number;
  baseDelay?: number;
}

const DEFAULT_BASE_URL = process.env.NEXT_PUBLIC_RELAY_WS_URL || "ws://localhost:8420";
const DEFAULT_MAX_RETRIES = 10;
const DEFAULT_BASE_DELAY = 1000;

export class RelayStream {
  private ws: WebSocket | null = null;
  private baseUrl: string;
  private channel: RelayChannel;
  private onMessage: (msg: RelayMessage) => void;
  private onTranscript: (segment: TranscriptSegment) => void;
  private onHistory: (entries: TranscriptSegment[]) => void;
  private onStateChange: (state: ConnectionState) => void;
  private maxRetries: number;
  private baseDelay: number;
  private retryCount = 0;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
  private isClosing = false;

  constructor(options: RelayStreamOptions = {}) {
    this.baseUrl = options.baseUrl || DEFAULT_BASE_URL;
    this.channel = options.channel || "transcript";
    this.onMessage = options.onMessage || (() => {});
    this.onTranscript = options.onTranscript || (() => {});
    this.onHistory = options.onHistory || (() => {});
    this.onStateChange = options.onStateChange || (() => {});
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.baseDelay = options.baseDelay ?? DEFAULT_BASE_DELAY;
  }

  private get url(): string {
    return `${this.baseUrl}/ws/${this.channel}`;
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
          const msg = JSON.parse(event.data) as RelayMessage;
          this.onMessage(msg);

          // Dispatch to specific handlers
          if (msg.type === "transcript") {
            this.onTranscript({
              id: msg.id,
              text: msg.text,
              timestamp: msg.timestamp,
              source: msg.source,
              confidence: msg.confidence,
              language: msg.language,
            });
          } else if (msg.type === "history") {
            this.onHistory(msg.entries);
          }
        } catch {
          console.error("[relayStream] Invalid JSON:", event.data);
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
      console.error("[relayStream] Connection error:", err);
      this.onStateChange("error");
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.isClosing || this.retryCount >= this.maxRetries) {
      return;
    }

    const delay = this.baseDelay * Math.pow(2, this.retryCount);
    this.retryCount++;

    console.log(`[relayStream] Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);

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
}

// Singleton instance for app-wide use
let instance: RelayStream | null = null;

export function getRelayStream(options?: RelayStreamOptions): RelayStream {
  if (!instance) {
    instance = new RelayStream(options);
  }
  return instance;
}

export function resetRelayStream(): void {
  if (instance) {
    instance.disconnect();
    instance = null;
  }
}
