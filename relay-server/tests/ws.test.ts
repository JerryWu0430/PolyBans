import { describe, it, expect, beforeEach, afterEach } from "vitest";
import http from "http";
import WebSocket from "ws";
import request from "supertest";
import { createServer } from "../src/index";
import { state } from "../src/state";
import { resetClients } from "../src/ws/handler";
import { WsFrameMessage, WsHistoryMessage, WsTranscriptMessage, WsTtsMessage } from "../src/types";

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

/**
 * Connect and collect the first `initialCount` messages sent during the
 * handshake. The message listener is attached *before* the socket opens
 * so nothing is lost to a race condition.
 */
function connectAndCollect(
  path: string,
  initialCount: number
): Promise<{ ws: WebSocket; messages: string[] }> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl(path));
    openSockets.push(ws);
    const messages: string[] = [];

    ws.on("message", (data) => {
      messages.push(data.toString());
      if (messages.length >= initialCount) {
        resolve({ ws, messages });
      }
    });

    ws.on("open", () => {
      // If we expect 0 initial messages or they've already arrived, resolve
      if (initialCount <= 0) {
        resolve({ ws, messages });
      }
    });

    ws.on("error", reject);

    // Safety timeout so we don't hang forever
    setTimeout(() => resolve({ ws, messages }), 2000);
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

describe("WS /ws/frames", () => {
  it("connects successfully", async () => {
    const ws = await connectWs("/ws/frames");
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it("sends latest frame on connect if one exists", async () => {
    // Ingest a frame first via the real server
    await request(app)
      .post("/ingest/frame")
      .attach("frame", Buffer.from("initial-frame"), "test.jpg");

    const { messages } = await connectAndCollect("/ws/frames", 1);
    expect(messages).toHaveLength(1);
    const msg: WsFrameMessage = JSON.parse(messages[0]);

    expect(msg.type).toBe("frame");
    expect(msg.id).toHaveLength(8);
    expect(msg.sizeBytes).toBe(13); // "initial-frame"
    expect(msg.data).toBe(Buffer.from("initial-frame").toString("base64"));
  });

  it("receives no initial message when no frames exist", async () => {
    const { messages } = await connectAndCollect("/ws/frames", 0);
    // Wait a bit to confirm nothing extra arrives
    await new Promise((r) => setTimeout(r, 100));
    expect(messages).toHaveLength(0);
  });

  it("receives broadcast when a new frame is ingested", async () => {
    const ws = await connectWs("/ws/frames");
    const msgPromise = waitForMessage(ws);

    await request(app)
      .post("/ingest/frame")
      .attach("frame", Buffer.from("live-frame"), "test.jpg");

    const raw = await msgPromise;
    const msg: WsFrameMessage = JSON.parse(raw);
    expect(msg.type).toBe("frame");
    expect(msg.data).toBe(Buffer.from("live-frame").toString("base64"));
  });

  it("shows up in health subscriber count", async () => {
    await connectWs("/ws/frames");
    await new Promise((r) => setTimeout(r, 50));

    const health = await request(app).get("/health");
    expect(health.body.frameSubscribers).toBeGreaterThanOrEqual(1);
  });
});

describe("WS /ws/transcript", () => {
  it("sends history on connect when transcripts exist", async () => {
    for (let i = 0; i < 15; i++) {
      await request(app)
        .post("/ingest/transcript")
        .send({ text: `msg-${i}` });
    }

    const { messages } = await connectAndCollect("/ws/transcript", 1);
    expect(messages).toHaveLength(1);
    const msg: WsHistoryMessage = JSON.parse(messages[0]);

    expect(msg.type).toBe("history");
    expect(msg.entries).toHaveLength(10); // last 10
    expect(msg.entries[0].text).toBe("msg-5");
    expect(msg.entries[9].text).toBe("msg-14");
  });

  it("receives no initial message when no transcripts exist", async () => {
    const { messages } = await connectAndCollect("/ws/transcript", 0);
    await new Promise((r) => setTimeout(r, 100));
    expect(messages).toHaveLength(0);
  });

  it("receives broadcast when a new transcript is ingested", async () => {
    const ws = await connectWs("/ws/transcript");
    const msgPromise = waitForMessage(ws);

    await request(app)
      .post("/ingest/transcript")
      .send({ text: "live segment", source: "test" });

    const raw = await msgPromise;
    const msg: WsTranscriptMessage = JSON.parse(raw);
    expect(msg.type).toBe("transcript");
    expect(msg.text).toBe("live segment");
    expect(msg.source).toBe("test");
  });
});

describe("WS /ws/all", () => {
  it("receives both frame and transcript on connect", async () => {
    await request(app)
      .post("/ingest/frame")
      .attach("frame", Buffer.from("combo-frame"), "test.jpg");
    await request(app)
      .post("/ingest/transcript")
      .send({ text: "combo-text" });

    const { messages } = await connectAndCollect("/ws/all", 2);
    const parsed = messages.map((m) => JSON.parse(m));

    const frameMsg = parsed.find((m) => m.type === "frame");
    const historyMsg = parsed.find((m) => m.type === "history");

    expect(frameMsg).toBeDefined();
    expect(frameMsg!.data).toBe(Buffer.from("combo-frame").toString("base64"));
    expect(historyMsg).toBeDefined();
    expect(historyMsg!.entries[0].text).toBe("combo-text");
  });

  it("receives live frame broadcasts", async () => {
    const ws = await connectWs("/ws/all");
    const msgPromise = waitForMessage(ws);

    await request(app)
      .post("/ingest/frame")
      .attach("frame", Buffer.from("all-frame"), "test.jpg");

    const msg = JSON.parse(await msgPromise);
    expect(msg.type).toBe("frame");
  });

  it("receives live transcript broadcasts", async () => {
    const ws = await connectWs("/ws/all");
    const msgPromise = waitForMessage(ws);

    await request(app)
      .post("/ingest/transcript")
      .send({ text: "all-transcript" });

    const msg = JSON.parse(await msgPromise);
    expect(msg.type).toBe("transcript");
    expect(msg.text).toBe("all-transcript");
  });

  it("counts in both subscriber categories", async () => {
    await connectWs("/ws/all");
    await new Promise((r) => setTimeout(r, 50));

    const health = await request(app).get("/health");
    expect(health.body.frameSubscribers).toBeGreaterThanOrEqual(1);
    expect(health.body.transcriptSubscribers).toBeGreaterThanOrEqual(1);
  });
});

describe("WS /ws/tts", () => {
  it("connects successfully", async () => {
    const ws = await connectWs("/ws/tts");
    expect(ws.readyState).toBe(WebSocket.OPEN);
  });

  it("receives no initial message on connect", async () => {
    // Even with TTS messages in state, no history is sent on connect
    await request(app)
      .post("/ingest/tts")
      .send({ text: "existing" });

    const { messages } = await connectAndCollect("/ws/tts", 0);
    await new Promise((r) => setTimeout(r, 100));
    expect(messages).toHaveLength(0);
  });

  it("receives broadcast when a TTS message is ingested", async () => {
    const ws = await connectWs("/ws/tts");
    const msgPromise = waitForMessage(ws);

    await request(app)
      .post("/ingest/tts")
      .send({ text: "speak this" });

    const raw = await msgPromise;
    const msg: WsTtsMessage = JSON.parse(raw);
    expect(msg.type).toBe("tts");
    expect(msg.text).toBe("speak this");
    expect(msg.id).toHaveLength(8);
    expect(msg.timestamp).toBeTypeOf("number");
  });

  it("shows up in health subscriber count", async () => {
    await connectWs("/ws/tts");
    await new Promise((r) => setTimeout(r, 50));

    const health = await request(app).get("/health");
    expect(health.body.ttsSubscribers).toBeGreaterThanOrEqual(1);
  });
});

describe("WS /ws/all receives TTS broadcasts", () => {
  it("receives live TTS broadcasts on /ws/all", async () => {
    const ws = await connectWs("/ws/all");
    const msgPromise = waitForMessage(ws);

    await request(app)
      .post("/ingest/tts")
      .send({ text: "all-tts" });

    const msg = JSON.parse(await msgPromise);
    expect(msg.type).toBe("tts");
    expect(msg.text).toBe("all-tts");
  });

  it("/ws/all counts in TTS subscriber category", async () => {
    await connectWs("/ws/all");
    await new Promise((r) => setTimeout(r, 50));

    const health = await request(app).get("/health");
    expect(health.body.ttsSubscribers).toBeGreaterThanOrEqual(1);
  });
});

describe("WS invalid paths", () => {
  it("rejects connection to unknown WS path", async () => {
    await expect(connectWs("/ws/invalid")).rejects.toThrow();
  });
});
