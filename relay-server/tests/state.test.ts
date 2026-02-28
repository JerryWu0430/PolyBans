import { describe, it, expect, beforeEach } from "vitest";
import { RingBuffer, RelayState } from "../src/state";
import { FrameEntry, TranscriptSegment, WsTtsMessage } from "../src/types";

function makeFrame(id: string): FrameEntry {
  const buf = Buffer.from(`frame-${id}`);
  return {
    meta: { id, timestamp: Date.now(), sizeBytes: buf.length },
    data: buf,
    base64: buf.toString("base64"),
  };
}

function makeTranscript(id: string, text: string): TranscriptSegment {
  return { id, text, timestamp: Date.now() };
}

function makeTts(id: string, text: string): WsTtsMessage {
  return { type: "tts", id, text, timestamp: Date.now() };
}

describe("RingBuffer", () => {
  let ring: RingBuffer<number>;

  beforeEach(() => {
    ring = new RingBuffer<number>(5);
  });

  it("stores and retrieves items", () => {
    ring.push(1);
    ring.push(2);
    ring.push(3);
    expect(ring.all()).toEqual([1, 2, 3]);
    expect(ring.length).toBe(3);
  });

  it("returns latest item", () => {
    ring.push(10);
    ring.push(20);
    expect(ring.latest()).toBe(20);
  });

  it("returns undefined when empty", () => {
    expect(ring.latest()).toBeUndefined();
  });

  it("evicts oldest items when capacity is exceeded", () => {
    for (let i = 1; i <= 7; i++) ring.push(i);
    expect(ring.length).toBe(5);
    expect(ring.all()).toEqual([3, 4, 5, 6, 7]);
  });

  it("lastN returns at most n items from the end", () => {
    for (let i = 1; i <= 5; i++) ring.push(i);
    expect(ring.lastN(3)).toEqual([3, 4, 5]);
    expect(ring.lastN(10)).toEqual([1, 2, 3, 4, 5]);
  });

  it("all returns a copy, not a reference", () => {
    ring.push(1);
    const copy = ring.all();
    copy.push(99);
    expect(ring.length).toBe(1);
  });

  it("clear empties the buffer", () => {
    ring.push(1);
    ring.push(2);
    ring.clear();
    expect(ring.length).toBe(0);
    expect(ring.latest()).toBeUndefined();
  });
});

describe("RelayState", () => {
  let state: RelayState;

  beforeEach(() => {
    state = new RelayState();
  });

  it("starts with zero counts", () => {
    expect(state.framesIngested).toBe(0);
    expect(state.transcriptsIngested).toBe(0);
    expect(state.ttsIngested).toBe(0);
  });

  it("tracks frame ingestion count", () => {
    state.addFrame(makeFrame("a"));
    state.addFrame(makeFrame("b"));
    expect(state.framesIngested).toBe(2);
  });

  it("tracks transcript ingestion count", () => {
    state.addTranscript(makeTranscript("1", "hello"));
    expect(state.transcriptsIngested).toBe(1);
  });

  it("returns latest frame", () => {
    state.addFrame(makeFrame("first"));
    state.addFrame(makeFrame("second"));
    expect(state.latestFrame()?.meta.id).toBe("second");
  });

  it("returns undefined when no frames", () => {
    expect(state.latestFrame()).toBeUndefined();
  });

  it("returns latest transcript", () => {
    state.addTranscript(makeTranscript("1", "one"));
    state.addTranscript(makeTranscript("2", "two"));
    expect(state.latestTranscript()?.text).toBe("two");
  });

  it("returns recent transcripts with limit", () => {
    for (let i = 0; i < 20; i++) {
      state.addTranscript(makeTranscript(`${i}`, `text-${i}`));
    }
    const recent = state.recentTranscripts(5);
    expect(recent).toHaveLength(5);
    expect(recent[0].text).toBe("text-15");
    expect(recent[4].text).toBe("text-19");
  });

  it("allTranscripts returns all stored segments", () => {
    state.addTranscript(makeTranscript("1", "a"));
    state.addTranscript(makeTranscript("2", "b"));
    expect(state.allTranscripts()).toHaveLength(2);
  });

  it("reset clears everything and resets counts", () => {
    state.addFrame(makeFrame("a"));
    state.addTranscript(makeTranscript("1", "hello"));
    state.addTts(makeTts("t1", "speak"));
    state.reset();
    expect(state.framesIngested).toBe(0);
    expect(state.transcriptsIngested).toBe(0);
    expect(state.ttsIngested).toBe(0);
    expect(state.latestFrame()).toBeUndefined();
    expect(state.latestTranscript()).toBeUndefined();
    expect(state.latestTts()).toBeUndefined();
  });

  it("uptimeS returns a non-negative number", () => {
    expect(state.uptimeS).toBeGreaterThanOrEqual(0);
  });

  it("respects frame ring buffer capacity of 30", () => {
    for (let i = 0; i < 35; i++) {
      state.addFrame(makeFrame(`f${i}`));
    }
    expect(state.frames.length).toBe(30);
    expect(state.framesIngested).toBe(35);
    expect(state.latestFrame()?.meta.id).toBe("f34");
  });

  it("respects transcript ring buffer capacity of 500", () => {
    for (let i = 0; i < 510; i++) {
      state.addTranscript(makeTranscript(`t${i}`, `text-${i}`));
    }
    expect(state.transcripts.length).toBe(500);
    expect(state.transcriptsIngested).toBe(510);
  });

  it("tracks TTS ingestion count", () => {
    state.addTts(makeTts("1", "hello"));
    state.addTts(makeTts("2", "world"));
    expect(state.ttsIngested).toBe(2);
  });

  it("returns latest TTS message", () => {
    state.addTts(makeTts("1", "first"));
    state.addTts(makeTts("2", "second"));
    expect(state.latestTts()?.text).toBe("second");
  });

  it("returns undefined when no TTS messages", () => {
    expect(state.latestTts()).toBeUndefined();
  });

  it("respects TTS ring buffer capacity of 50", () => {
    for (let i = 0; i < 55; i++) {
      state.addTts(makeTts(`t${i}`, `text-${i}`));
    }
    expect(state.ttsMessages.length).toBe(50);
    expect(state.ttsIngested).toBe(55);
    expect(state.latestTts()?.id).toBe("t54");
  });
});
