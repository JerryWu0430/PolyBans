import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "http";
import WebSocket from "ws";
import request from "supertest";
import { createServer } from "../src/index";
import { state } from "../src/state";
import { resetClients } from "../src/ws/handler";

let server: http.Server;
let app: ReturnType<typeof createServer>["app"];
let port: number;
const openSockets: WebSocket[] = [];

function wsUrl(path: string): string {
  return `ws://localhost:${port}${path}`;
}

function connectWs(path: string): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl(path));
    openSockets.push(ws);
    ws.on("open", () => resolve(ws));
    ws.on("error", reject);
  });
}

function waitForMessage(ws: WebSocket): Promise<string> {
  return new Promise((resolve) => {
    ws.once("message", (data) => resolve(data.toString()));
  });
}

beforeEach(
  () =>
    new Promise<void>((resolve) => {
      state.reset();
      resetClients();
      ({ app, server } = createServer());
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    })
);

afterEach(
  () =>
    new Promise<void>((resolve) => {
      for (const ws of openSockets) {
        if (ws.readyState === WebSocket.OPEN) ws.close();
      }
      openSockets.length = 0;
      server.close(() => resolve());
    })
);

describe("WS edge cases", () => {
  it("broadcast skips closed sockets without error", async () => {
    const ws = await connectWs("/ws/frames");
    // Close the socket
    ws.close();
    await new Promise((r) => setTimeout(r, 100));

    // Ingest a frame — should not throw even with closed socket
    const res = await request(app)
      .post("/ingest/frame")
      .attach("frame", Buffer.from("test-frame"), "test.jpg");
    expect(res.status).toBe(200);
  });

  it("subscriber count decrements after disconnect", async () => {
    const ws = await connectWs("/ws/frames");
    await new Promise((r) => setTimeout(r, 50));

    const before = await request(app).get("/health");
    expect(before.body.frameSubscribers).toBeGreaterThanOrEqual(1);

    ws.close();
    await new Promise((r) => setTimeout(r, 100));

    const after = await request(app).get("/health");
    expect(after.body.frameSubscribers).toBeLessThan(before.body.frameSubscribers);
  });

  it("client removed from correct channel only", async () => {
    const frameWs = await connectWs("/ws/frames");
    await connectWs("/ws/transcript");
    await new Promise((r) => setTimeout(r, 50));

    const before = await request(app).get("/health");
    const frameBefore = before.body.frameSubscribers;
    const transBefore = before.body.transcriptSubscribers;

    // Close only the frame socket
    frameWs.close();
    await new Promise((r) => setTimeout(r, 100));

    const after = await request(app).get("/health");
    expect(after.body.frameSubscribers).toBeLessThan(frameBefore);
    expect(after.body.transcriptSubscribers).toBe(transBefore);
  });

  it("multiple clients on same channel all receive broadcasts", async () => {
    const ws1 = await connectWs("/ws/transcript");
    const ws2 = await connectWs("/ws/transcript");

    const p1 = waitForMessage(ws1);
    const p2 = waitForMessage(ws2);

    await request(app)
      .post("/ingest/transcript")
      .send({ text: "broadcast test" });

    const [msg1, msg2] = await Promise.all([p1, p2]);
    expect(JSON.parse(msg1).text).toBe("broadcast test");
    expect(JSON.parse(msg2).text).toBe("broadcast test");
  });

  it("rapid connect/disconnect does not crash server", async () => {
    // Connect and immediately close several sockets
    for (let i = 0; i < 5; i++) {
      const ws = await connectWs("/ws/frames");
      ws.close();
    }
    await new Promise((r) => setTimeout(r, 200));

    // Server should still be healthy
    const health = await request(app).get("/health");
    expect(health.status).toBe(200);
  });
});
