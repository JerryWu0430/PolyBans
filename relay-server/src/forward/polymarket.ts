import WebSocket from "ws";

const RECONNECT_DELAY_MS = 3_000;

let ws: WebSocket | null = null;
let url: string = "";
let enabled = false;

function connect(): void {
  if (!enabled || !url) return;

  ws = new WebSocket(url);

  ws.on("open", () => {
    console.log(`[polymarket-fwd] Connected to ${url}`);
  });

  ws.on("message", (data) => {
    // Log responses from polymarket (analysis results, market data)
    try {
      const msg = JSON.parse(data.toString());
      if (msg.type === "markets") {
        console.log(
          `[polymarket-fwd] Received ${msg.data?.markets?.length ?? 0} markets`
        );
      } else if (msg.type === "analysis") {
        console.log(
          `[polymarket-fwd] Analysis: detected=${msg.data?.detected}, reason="${msg.data?.reason}"`
        );
      } else if (msg.type === "buffering") {
        console.log(
          `[polymarket-fwd] Buffering: ${msg.chars}/${msg.threshold} chars`
        );
      }
    } catch {
      // ignore non-JSON
    }
  });

  ws.on("close", () => {
    console.log(
      `[polymarket-fwd] Disconnected, reconnecting in ${RECONNECT_DELAY_MS}ms...`
    );
    ws = null;
    setTimeout(connect, RECONNECT_DELAY_MS);
  });

  ws.on("error", (err) => {
    console.error(`[polymarket-fwd] Error: ${err.message}`);
    // close handler will fire next and trigger reconnect
  });
}

export function initPolymarketForwarder(polymarketWsUrl: string): void {
  url = polymarketWsUrl;
  enabled = true;
  console.log(`[polymarket-fwd] Forwarding transcripts to ${url}`);
  connect();
}

export function forwardTranscript(text: string): void {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  ws.send(JSON.stringify({ type: "transcript", text }));
}

export function resetForwarder(): void {
  enabled = false;
  if (ws) {
    ws.removeAllListeners();
    if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
      ws.close();
    }
    ws = null;
  }
  url = "";
}
