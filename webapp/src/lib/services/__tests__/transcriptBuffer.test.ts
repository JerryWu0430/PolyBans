import { describe, it, expect, beforeEach } from "vitest";
import { TranscriptBuffer, MIN_CHARS_TO_PROCESS } from "../transcriptBuffer";

describe("TranscriptBuffer", () => {
  let buffer: TranscriptBuffer;

  beforeEach(() => {
    buffer = new TranscriptBuffer();
  });

  it("accumulates text via append", () => {
    buffer.append("hello");
    buffer.append("world");
    expect(buffer.length).toBeGreaterThan(0);
    const text = buffer.flush();
    expect(text).toContain("hello");
    expect(text).toContain("world");
  });

  it("reports ready when buffer reaches 300 char threshold", () => {
    const shortResult = buffer.append("short");
    expect(shortResult.ready).toBe(false);

    // Fill buffer past threshold
    const longText = "a".repeat(MIN_CHARS_TO_PROCESS);
    const result = buffer.append(longText);
    expect(result.ready).toBe(true);
    expect(result.charsBuffered).toBeGreaterThanOrEqual(MIN_CHARS_TO_PROCESS);
  });

  it("blocks ready when isProcessing is true", () => {
    buffer.isProcessing = true;
    const longText = "a".repeat(MIN_CHARS_TO_PROCESS);
    const result = buffer.append(longText);
    expect(result.ready).toBe(false);
    expect(result.charsBuffered).toBeGreaterThanOrEqual(MIN_CHARS_TO_PROCESS);
  });

  it("flush drains the buffer and returns text", () => {
    buffer.append("some text");
    const text = buffer.flush();
    expect(text).toContain("some text");
    expect(buffer.length).toBe(0);
  });

  it("flush returns empty-ish string when buffer is empty", () => {
    const text = buffer.flush();
    expect(text).toBe("");
  });

  it("reset clears buffer and isProcessing flag", () => {
    buffer.append("data");
    buffer.isProcessing = true;
    buffer.reset();
    expect(buffer.length).toBe(0);
    expect(buffer.isProcessing).toBe(false);
  });

  it("threshold getter returns MIN_CHARS_TO_PROCESS", () => {
    expect(buffer.threshold).toBe(MIN_CHARS_TO_PROCESS);
    expect(buffer.threshold).toBe(300);
  });

  it("tracks charsBuffered accurately across multiple appends", () => {
    const r1 = buffer.append("hello");
    const r2 = buffer.append("world");
    // Each append prepends a space, so " hello" + " world"
    expect(r2.charsBuffered).toBe(r1.charsBuffered + " world".length);
  });
});
