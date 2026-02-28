import { Server as HTTPServer, IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { Duplex } from "stream";

const clients = new Set<WebSocket>();

export function setupWebSocket(server: HTTPServer): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req: IncomingMessage, socket: Duplex, head: Buffer) => {
    // Only handle /ws path
    if (req.url !== "/ws") {
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req);
    });
  });

  wss.on("connection", (ws) => {
    clients.add(ws);
    console.log(`[WS] Client connected. Total: ${clients.size}`);

    // Send connection status
    ws.send(JSON.stringify({ type: "CONNECTION_STATUS", payload: "connected" }));

    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data.toString());
        // Broadcast to all other clients
        broadcast(message, ws);
      } catch {
        console.error("[WS] Invalid message format");
      }
    });

    ws.on("close", () => {
      clients.delete(ws);
      console.log(`[WS] Client disconnected. Total: ${clients.size}`);
    });

    ws.on("error", (err) => {
      console.error("[WS] Error:", err);
      clients.delete(ws);
    });
  });

  return wss;
}

export function broadcast(message: unknown, exclude?: WebSocket): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function broadcastToAll(message: unknown): void {
  broadcast(message);
}
