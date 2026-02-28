import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import request from "supertest";
import { createServer } from "../src/index";
import { state } from "../src/state";
import { resetClients } from "../src/ws/handler";
import {
  initPolymarketForwarder,
  forwardTranscript,
  resetForwarder,
} from "../src/forward/polymarket";

// --- helpers to spin up a mock polymarket WS server ---

let mockServer: http.Server;
let mockWss: WebSocketServer;
let mockPort: number;
const mockReceived: string[] = [];
let mockConnections = 0;

function startMockPolymarket(): Promise<void> {
  return new Promise((resolve) => {
    mockServer = http.createServer();
    mockWss = new WebSocketServer({ server: mockServer, path: "/api/stream" });

    mockWss.on("connection", (ws) => {
      mockConnections++;
      ws.on("message", (data) => {
        mockReceived.push(data.toString());
      });
    });

    mockServer.listen(0, () => {
      const addr = mockServer.address();
      mockPort = typeof addr === "object" && addr ? addr.port : 0;
      resolve();
    });
  });
}

function stopMockPolymarket(): Promise<void> {
  return new Promise((resolve) => {
    for (const client of mockWss.clients) {
      client.close();
    }
    mockWss.close();
    mockServer.close(() => resolve());
  });
}

function waitForMockMessages(count: number, timeoutMs = 3000): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const check = () => {
      if (mockReceived.length >= count) return resolve();
      if (Date.now() - start > timeoutMs) return resolve(); // don't hang, let assertions fail
      setTimeout(check, 20);
    };
    check();
  });
}

function waitForMockConnection(timeoutMs = 3000): Promise<void> {
  return new Promise((resolve) => {
    const start = Date.now();
    const check = () => {
      if (mockConnections > 0) return resolve();
      if (Date.now() - start > timeoutMs) return resolve();
      setTimeout(check, 20);
    };
    check();
  });
}

beforeEach(async () => {
  mockReceived.length = 0;
  mockConnections = 0;
  resetForwarder();
  state.reset();
  resetClients();
  await startMockPolymarket();
});

afterEach(async () => {
  resetForwarder();
  await stopMockPolymarket();
});

describe("Polymarket forwarder", () => {
  it("connects to the mock polymarket WS server", async () => {
    initPolymarketForwarder(`ws://localhost:${mockPort}/api/stream`);
    await waitForMockConnection();
    expect(mockConnections).toBe(1);
  });

  it("forwards transcript text via forwardTranscript()", async () => {
    initPolymarketForwarder(`ws://localhost:${mockPort}/api/stream`);
    await waitForMockConnection();

    forwardTranscript("hello from glasses");
    await waitForMockMessages(1);

    expect(mockReceived).toHaveLength(1);
    const msg = JSON.parse(mockReceived[0]);
    expect(msg).toEqual({ type: "transcript", text: "hello from glasses" });
  });

  it("forwards multiple transcripts in order", async () => {
    initPolymarketForwarder(`ws://localhost:${mockPort}/api/stream`);
    await waitForMockConnection();

    forwardTranscript("first");
    forwardTranscript("second");
    forwardTranscript("third");
    await waitForMockMessages(3);

    expect(mockReceived).toHaveLength(3);
    const texts = mockReceived.map((r) => JSON.parse(r).text);
    expect(texts).toEqual(["first", "second", "third"]);
  });

  it("silently drops messages when not connected", () => {
    // Don't init — forwarder is not connected
    expect(() => forwardTranscript("dropped")).not.toThrow();
    expect(mockReceived).toHaveLength(0);
  });

  it("does not forward when forwarder is reset", async () => {
    initPolymarketForwarder(`ws://localhost:${mockPort}/api/stream`);
    await waitForMockConnection();

    resetForwarder();
    forwardTranscript("should be dropped");

    await new Promise((r) => setTimeout(r, 100));
    expect(mockReceived).toHaveLength(0);
  });
});

describe("Forwarder integration with ingest route", () => {
  it("POST /ingest/transcript forwards to polymarket", async () => {
    initPolymarketForwarder(`ws://localhost:${mockPort}/api/stream`);
    await waitForMockConnection();

    const { app } = createServer();
    await request(app)
      .post("/ingest/transcript")
      .send({ text: "someone mentioned the election" });

    await waitForMockMessages(1);

    expect(mockReceived).toHaveLength(1);
    const msg = JSON.parse(mockReceived[0]);
    expect(msg.type).toBe("transcript");
    expect(msg.text).toBe("someone mentioned the election");
  });

  it("POST /ingest/transcript still succeeds when polymarket is down", async () => {
    // Stop mock server so forwarder can't connect
    await stopMockPolymarket();

    const { app } = createServer();
    const res = await request(app)
      .post("/ingest/transcript")
      .send({ text: "polymarket is offline" });

    expect(res.status).toBe(200);
    expect(res.body.text).toBe("polymarket is offline");

    // Restart for afterEach cleanup
    await startMockPolymarket();
  });

  it("POST /ingest/frame does NOT forward to polymarket", async () => {
    initPolymarketForwarder(`ws://localhost:${mockPort}/api/stream`);
    await waitForMockConnection();

    const { app } = createServer();
    await request(app)
      .post("/ingest/frame")
      .attach("frame", Buffer.from("jpeg-data"), "test.jpg");

    await new Promise((r) => setTimeout(r, 100));
    expect(mockReceived).toHaveLength(0);
  });
});

describe("Forwarder reconnect", () => {
  it("reconnects after the upstream server restarts", async () => {
    initPolymarketForwarder(`ws://localhost:${mockPort}/api/stream`);
    await waitForMockConnection();
    expect(mockConnections).toBe(1);

    // Kill the mock server
    const savedPort = mockPort;
    await stopMockPolymarket();

    // Wait for reconnect attempt delay
    await new Promise((r) => setTimeout(r, 500));

    // Restart on the same port
    await new Promise<void>((resolve) => {
      mockServer = http.createServer();
      mockWss = new WebSocketServer({ server: mockServer, path: "/api/stream" });
      mockWss.on("connection", (ws) => {
        mockConnections++;
        ws.on("message", (data) => mockReceived.push(data.toString()));
      });
      mockServer.listen(savedPort, () => {
        mockPort = savedPort;
        resolve();
      });
    });

    // Wait for the forwarder to reconnect (3s reconnect delay + buffer)
    await new Promise((r) => setTimeout(r, 4000));

    expect(mockConnections).toBeGreaterThanOrEqual(2);

    // Verify it can still forward after reconnect
    forwardTranscript("after reconnect");
    await waitForMockMessages(1);
    expect(mockReceived.length).toBeGreaterThanOrEqual(1);
    const last = JSON.parse(mockReceived[mockReceived.length - 1]);
    expect(last.text).toBe("after reconnect");
  }, 10_000);
});
