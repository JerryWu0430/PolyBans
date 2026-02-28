import http from "http";
import express from "express";
import cors from "cors";
import ingestRoutes from "./routes/ingest";
import consumeRoutes from "./routes/consume";
import healthRoutes from "./routes/health";
import { attachWebSocket } from "./ws/handler";
import { initPolymarketForwarder } from "./forward/polymarket";

export function createServer(): { app: express.Express; server: http.Server } {
  const app = express();

  app.use(cors());
  app.use(express.json());

  app.use("/ingest", ingestRoutes);
  app.use("/", consumeRoutes);
  app.use("/", healthRoutes);

  const server = http.createServer(app);
  attachWebSocket(server);

  return { app, server };
}

if (require.main === module) {
  const PORT = parseInt(process.env.PORT || "8420", 10);
  const { server } = createServer();

  const POLYMARKET_WS_URL =
    process.env.POLYMARKET_WS_URL || "ws://localhost:3001/api/stream";
  initPolymarketForwarder(POLYMARKET_WS_URL);

  server.listen(PORT, () => {
    console.log(`Relay server listening on port ${PORT}`);
    console.log(`  REST:  http://localhost:${PORT}/health`);
    console.log(`  WS:    ws://localhost:${PORT}/ws/frames`);
    console.log(`  WS:    ws://localhost:${PORT}/ws/transcript`);
    console.log(`  WS:    ws://localhost:${PORT}/ws/all`);
    console.log(`  FWD:   ${POLYMARKET_WS_URL}`);
  });
}
