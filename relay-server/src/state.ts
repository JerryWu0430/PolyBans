import { TranscriptSegment, FrameEntry, FrameMeta } from "./types";

export class RingBuffer<T> {
  private buffer: T[] = [];
  private capacity: number;

  constructor(capacity: number) {
    this.capacity = capacity;
  }

  push(item: T): void {
    if (this.buffer.length >= this.capacity) {
      this.buffer.shift();
    }
    this.buffer.push(item);
  }

  latest(): T | undefined {
    return this.buffer[this.buffer.length - 1];
  }

  lastN(n: number): T[] {
    return this.buffer.slice(-n);
  }

  all(): T[] {
    return [...this.buffer];
  }

  get length(): number {
    return this.buffer.length;
  }

  clear(): void {
    this.buffer = [];
  }
}

export class RelayState {
  readonly frames = new RingBuffer<FrameEntry>(30);
  readonly transcripts = new RingBuffer<TranscriptSegment>(500);

  private _framesIngested = 0;
  private _transcriptsIngested = 0;
  private readonly _startTime = Date.now();

  get framesIngested(): number {
    return this._framesIngested;
  }

  get transcriptsIngested(): number {
    return this._transcriptsIngested;
  }

  get uptimeS(): number {
    return Math.floor((Date.now() - this._startTime) / 1000);
  }

  addFrame(entry: FrameEntry): void {
    this.frames.push(entry);
    this._framesIngested++;
  }

  addTranscript(segment: TranscriptSegment): void {
    this.transcripts.push(segment);
    this._transcriptsIngested++;
  }

  latestFrame(): FrameEntry | undefined {
    return this.frames.latest();
  }

  latestTranscript(): TranscriptSegment | undefined {
    return this.transcripts.latest();
  }

  recentTranscripts(limit: number): TranscriptSegment[] {
    return this.transcripts.lastN(limit);
  }

  allTranscripts(): TranscriptSegment[] {
    return this.transcripts.all();
  }

  reset(): void {
    this.frames.clear();
    this.transcripts.clear();
    this._framesIngested = 0;
    this._transcriptsIngested = 0;
  }
}

export const state = new RelayState();
