import { Server as HttpServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { state } from "../state";
import { WsFrameMessage, WsTranscriptMessage, WsHistoryMessage, WsTtsMessage } from "../types";

const frameClients = new Set<WebSocket>();
const transcriptClients = new Set<WebSocket>();
const ttsClients = new Set<WebSocket>();
const allClients = new Set<WebSocket>();

function safeSend(ws: WebSocket, data: string): boolean {
  if (ws.readyState !== WebSocket.OPEN) return false;
  try {
    ws.send(data);
    return true;
  } catch {
    return false;
  }
}

function pruneSet(set: Set<WebSocket>): void {
  for (const ws of set) {
    if (ws.readyState !== WebSocket.OPEN) {
      set.delete(ws);
    }
  }
}

export function broadcastFrame(msg: WsFrameMessage): void {
  const payload = JSON.stringify(msg);
  for (const ws of frameClients) {
    if (!safeSend(ws, payload)) frameClients.delete(ws);
  }
  for (const ws of allClients) {
    if (!safeSend(ws, payload)) allClients.delete(ws);
  }
}

export function broadcastTranscript(msg: WsTranscriptMessage): void {
  const payload = JSON.stringify(msg);
  for (const ws of transcriptClients) {
    if (!safeSend(ws, payload)) transcriptClients.delete(ws);
  }
  for (const ws of allClients) {
    if (!safeSend(ws, payload)) allClients.delete(ws);
  }
}

export function broadcastTts(msg: WsTtsMessage): void {
  const payload = JSON.stringify(msg);
  for (const ws of ttsClients) {
    if (!safeSend(ws, payload)) ttsClients.delete(ws);
  }
  for (const ws of allClients) {
    if (!safeSend(ws, payload)) allClients.delete(ws);
  }
}

export function getSubscriberCounts(): {
  frameSubscribers: number;
  transcriptSubscribers: number;
  ttsSubscribers: number;
} {
  pruneSet(frameClients);
  pruneSet(transcriptClients);
  pruneSet(ttsClients);
  pruneSet(allClients);
  return {
    frameSubscribers: frameClients.size + allClients.size,
    transcriptSubscribers: transcriptClients.size + allClients.size,
    ttsSubscribers: ttsClients.size + allClients.size,
  };
}

export function resetClients(): void {
  frameClients.clear();
  transcriptClients.clear();
  ttsClients.clear();
  allClients.clear();
}

export function attachWebSocket(server: HttpServer): void {
  const wss = new WebSocketServer({ noServer: true });

  // Ping all clients every 30s to keep connections alive through NATs/proxies
  const pingInterval = setInterval(() => {
    for (const set of [frameClients, transcriptClients, ttsClients, allClients]) {
      for (const ws of set) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }
  }, 30_000);

  server.on("close", () => clearInterval(pingInterval));

  server.on("upgrade", (req: IncomingMessage, socket, head) => {
    const pathname = new URL(req.url || "/", "http://localhost").pathname;

    if (
      pathname === "/ws/frames" ||
      pathname === "/ws/transcript" ||
      pathname === "/ws/tts" ||
      pathname === "/ws/all"
    ) {
      wss.handleUpgrade(req, socket, head, (ws) => {
        handleConnection(ws, pathname);
      });
    } else {
      socket.destroy();
    }
  });
}

function removeFromAll(ws: WebSocket): void {
  frameClients.delete(ws);
  transcriptClients.delete(ws);
  ttsClients.delete(ws);
  allClients.delete(ws);
}

function handleConnection(ws: WebSocket, path: string): void {
  // Prevent unhandled errors from crashing the server
  ws.on("error", () => removeFromAll(ws));

  switch (path) {
    case "/ws/frames": {
      frameClients.add(ws);
      // Send latest frame immediately
      const latest = state.latestFrame();
      if (latest) {
        const msg: WsFrameMessage = {
          type: "frame",
          id: latest.meta.id,
          timestamp: latest.meta.timestamp,
          sizeBytes: latest.meta.sizeBytes,
          data: latest.base64,
        };
        safeSend(ws, JSON.stringify(msg));
      }
      ws.on("close", () => frameClients.delete(ws));
      break;
    }

    case "/ws/transcript": {
      transcriptClients.add(ws);
      // Send last 10 transcript entries as history
      const entries = state.recentTranscripts(10);
      if (entries.length > 0) {
        const msg: WsHistoryMessage = { type: "history", entries };
        safeSend(ws, JSON.stringify(msg));
      }
      ws.on("close", () => transcriptClients.delete(ws));
      break;
    }

    case "/ws/tts": {
      ttsClients.add(ws);
      ws.on("close", () => ttsClients.delete(ws));
      break;
    }

    case "/ws/all": {
      allClients.add(ws);
      // Send latest frame
      const latestFrame = state.latestFrame();
      if (latestFrame) {
        const frameMsg: WsFrameMessage = {
          type: "frame",
          id: latestFrame.meta.id,
          timestamp: latestFrame.meta.timestamp,
          sizeBytes: latestFrame.meta.sizeBytes,
          data: latestFrame.base64,
        };
        safeSend(ws, JSON.stringify(frameMsg));
      }
      // Send transcript history
      const entries = state.recentTranscripts(10);
      if (entries.length > 0) {
        const historyMsg: WsHistoryMessage = { type: "history", entries };
        safeSend(ws, JSON.stringify(historyMsg));
      }
      ws.on("close", () => allClients.delete(ws));
      break;
    }
  }
}
