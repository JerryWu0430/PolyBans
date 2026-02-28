/**
 * TranscriptBuffer — per-session buffer for live transcript streaming.
 *
 * Encapsulates buffer logic per session so multiple concurrent users
 * are fully isolated.
 */

export const MIN_CHARS_TO_PROCESS = 300; // ~30 sec of speech
const CONTEXT_OVERLAP = 200; // keep last N chars on flush

export interface AppendResult {
  ready: boolean;
  charsBuffered: number;
}

export class TranscriptBuffer {
  private _buf = "";
  public isProcessing = false;

  /**
   * Append a new transcript chunk.
   */
  append(text: string): AppendResult {
    this._buf += " " + text.trim();
    return {
      ready: this._buf.length >= MIN_CHARS_TO_PROCESS && !this.isProcessing,
      charsBuffered: this._buf.length,
    };
  }

  /**
   * Returns the text to analyse and retains a context-overlap tail.
   * Must only be called when ready === true.
   */
  flush(): string {
    const text = this._buf;
    this._buf =
      text.length > CONTEXT_OVERLAP ? text.slice(-CONTEXT_OVERLAP) : "";
    return text;
  }

  /** Clear everything (on disconnect / stop message). */
  reset(): void {
    this._buf = "";
    this.isProcessing = false;
  }

  get length(): number {
    return this._buf.length;
  }

  get threshold(): number {
    return MIN_CHARS_TO_PROCESS;
  }
}
