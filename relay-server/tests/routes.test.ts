import { describe, it, expect, beforeEach } from "vitest";
import request from "supertest";
import { createServer } from "../src/index";
import { state } from "../src/state";
import { resetClients } from "../src/ws/handler";

describe("REST endpoints", () => {
  let app: ReturnType<typeof createServer>["app"];

  beforeEach(() => {
    state.reset();
    resetClients();
    ({ app } = createServer());
  });

  describe("GET /health", () => {
    it("returns ok status with zero counts initially", async () => {
      const res = await request(app).get("/health");
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("ok");
      expect(res.body.framesIngested).toBe(0);
      expect(res.body.transcriptsIngested).toBe(0);
      expect(res.body.uptimeS).toBeGreaterThanOrEqual(0);
      expect(res.body).toHaveProperty("frameSubscribers");
      expect(res.body).toHaveProperty("transcriptSubscribers");
      expect(res.body).toHaveProperty("ttsSubscribers");
      expect(res.body).toHaveProperty("ttsIngested");
    });
  });

  describe("POST /ingest/transcript", () => {
    it("accepts valid transcript", async () => {
      const res = await request(app)
        .post("/ingest/transcript")
        .send({ text: "hello world", source: "whisper", confidence: 0.9 });
      expect(res.status).toBe(200);
      expect(res.body.text).toBe("hello world");
      expect(res.body.source).toBe("whisper");
      expect(res.body.confidence).toBe(0.9);
      expect(res.body.id).toHaveLength(8);
      expect(res.body.timestamp).toBeTypeOf("number");
    });

    it("accepts transcript with only text field", async () => {
      const res = await request(app)
        .post("/ingest/transcript")
        .send({ text: "minimal" });
      expect(res.status).toBe(200);
      expect(res.body.text).toBe("minimal");
      expect(res.body).not.toHaveProperty("source");
    });

    it("accepts transcript with custom timestamp", async () => {
      const ts = 1700000000000;
      const res = await request(app)
        .post("/ingest/transcript")
        .send({ text: "timed", timestamp: ts });
      expect(res.status).toBe(200);
      expect(res.body.timestamp).toBe(ts);
    });

    it("rejects missing text", async () => {
      const res = await request(app)
        .post("/ingest/transcript")
        .send({ source: "whisper" });
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("text");
    });

    it("rejects non-string text", async () => {
      const res = await request(app)
        .post("/ingest/transcript")
        .send({ text: 123 });
      expect(res.status).toBe(400);
    });

    it("rejects empty text", async () => {
      const res = await request(app)
        .post("/ingest/transcript")
        .send({ text: "" });
      expect(res.status).toBe(400);
    });

    it("increments health counters", async () => {
      await request(app)
        .post("/ingest/transcript")
        .send({ text: "one" });
      await request(app)
        .post("/ingest/transcript")
        .send({ text: "two" });
      const health = await request(app).get("/health");
      expect(health.body.transcriptsIngested).toBe(2);
    });
  });

  describe("POST /ingest/frame", () => {
    it("accepts a file upload", async () => {
      const res = await request(app)
        .post("/ingest/frame")
        .attach("frame", Buffer.from("fake-jpeg"), "test.jpg");
      expect(res.status).toBe(200);
      expect(res.body.id).toHaveLength(8);
      expect(res.body.sizeBytes).toBe(9); // "fake-jpeg" = 9 bytes
      expect(res.body.timestamp).toBeTypeOf("number");
    });

    it("rejects request with no file", async () => {
      const res = await request(app).post("/ingest/frame");
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("No file");
    });

    it("rejects wrong field name with 400", async () => {
      const res = await request(app)
        .post("/ingest/frame")
        .attach("image", Buffer.from("data"), "test.jpg");
      expect(res.status).toBe(400);
      expect(res.body.error).toBeDefined();
    });

    it("increments health counters", async () => {
      await request(app)
        .post("/ingest/frame")
        .attach("frame", Buffer.from("a"), "a.jpg");
      const health = await request(app).get("/health");
      expect(health.body.framesIngested).toBe(1);
    });
  });

  describe("POST /ingest/tts", () => {
    it("accepts valid TTS text", async () => {
      const res = await request(app)
        .post("/ingest/tts")
        .send({ text: "Hello from glasses" });
      expect(res.status).toBe(200);
      expect(res.body.text).toBe("Hello from glasses");
      expect(res.body.id).toHaveLength(8);
      expect(res.body.timestamp).toBeTypeOf("number");
    });

    it("rejects missing text", async () => {
      const res = await request(app)
        .post("/ingest/tts")
        .send({});
      expect(res.status).toBe(400);
      expect(res.body.error).toContain("text");
    });

    it("rejects non-string text", async () => {
      const res = await request(app)
        .post("/ingest/tts")
        .send({ text: 123 });
      expect(res.status).toBe(400);
    });

    it("rejects empty text", async () => {
      const res = await request(app)
        .post("/ingest/tts")
        .send({ text: "" });
      expect(res.status).toBe(400);
    });

    it("increments health counters", async () => {
      await request(app)
        .post("/ingest/tts")
        .send({ text: "one" });
      await request(app)
        .post("/ingest/tts")
        .send({ text: "two" });
      const health = await request(app).get("/health");
      expect(health.body.ttsIngested).toBe(2);
    });
  });

  describe("GET /frames/latest", () => {
    it("returns 404 when no frames", async () => {
      const res = await request(app).get("/frames/latest");
      expect(res.status).toBe(404);
    });

    it("returns latest frame as image/jpeg with X-Frame-Id header", async () => {
      const frameData = Buffer.from("jpeg-data");
      await request(app)
        .post("/ingest/frame")
        .attach("frame", frameData, "test.jpg");

      const res = await request(app).get("/frames/latest");
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toContain("image/jpeg");
      expect(res.headers["x-frame-id"]).toHaveLength(8);
      expect(res.body).toEqual(frameData);
    });
  });

  describe("GET /frames/latest/meta", () => {
    it("returns 404 when no frames", async () => {
      const res = await request(app).get("/frames/latest/meta");
      expect(res.status).toBe(404);
    });

    it("returns metadata JSON", async () => {
      await request(app)
        .post("/ingest/frame")
        .attach("frame", Buffer.from("data"), "test.jpg");

      const res = await request(app).get("/frames/latest/meta");
      expect(res.status).toBe(200);
      expect(res.body.id).toHaveLength(8);
      expect(res.body.sizeBytes).toBe(4);
      expect(res.body.timestamp).toBeTypeOf("number");
    });
  });

  describe("GET /transcript", () => {
    it("returns empty entries when none ingested", async () => {
      const res = await request(app).get("/transcript");
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(0);
      expect(res.body.entries).toEqual([]);
    });

    it("returns entries with default limit", async () => {
      for (let i = 0; i < 5; i++) {
        await request(app)
          .post("/ingest/transcript")
          .send({ text: `msg-${i}` });
      }
      const res = await request(app).get("/transcript");
      expect(res.body.count).toBe(5);
      expect(res.body.entries).toHaveLength(5);
    });

    it("respects limit query param", async () => {
      for (let i = 0; i < 10; i++) {
        await request(app)
          .post("/ingest/transcript")
          .send({ text: `msg-${i}` });
      }
      const res = await request(app).get("/transcript?limit=3");
      expect(res.body.count).toBe(3);
      expect(res.body.entries).toHaveLength(3);
    });

    it("clamps limit to valid range", async () => {
      const res = await request(app).get("/transcript?limit=0");
      expect(res.status).toBe(200);
      // limit=0 → parsed as NaN → default 50, but clamped min 1
    });
  });

  describe("GET /transcript/latest", () => {
    it("returns 404 when no transcripts", async () => {
      const res = await request(app).get("/transcript/latest");
      expect(res.status).toBe(404);
    });

    it("returns the most recent segment", async () => {
      await request(app)
        .post("/ingest/transcript")
        .send({ text: "first" });
      await request(app)
        .post("/ingest/transcript")
        .send({ text: "second" });

      const res = await request(app).get("/transcript/latest");
      expect(res.status).toBe(200);
      expect(res.body.text).toBe("second");
    });
  });

  describe("GET /transcript/full", () => {
    it("returns empty text when no transcripts", async () => {
      const res = await request(app).get("/transcript/full");
      expect(res.status).toBe(200);
      expect(res.body.text).toBe("");
      expect(res.body.segments).toBe(0);
    });

    it("concatenates all transcript text", async () => {
      await request(app)
        .post("/ingest/transcript")
        .send({ text: "hello" });
      await request(app)
        .post("/ingest/transcript")
        .send({ text: "world" });

      const res = await request(app).get("/transcript/full");
      expect(res.body.text).toBe("hello world");
      expect(res.body.segments).toBe(2);
    });
  });

  describe("CORS", () => {
    it("includes CORS headers", async () => {
      const res = await request(app).get("/health");
      expect(res.headers["access-control-allow-origin"]).toBe("*");
    });
  });
});
