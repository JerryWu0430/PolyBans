/**
 * TranscriptBuffer — per-session buffer for live transcript streaming.
 * Mirrors PolyWhisper's buffer logic but encapsulated per WS session
 * so multiple concurrent users are fully isolated.
 */

const MIN_CHARS_TO_PROCESS = 600  // ~1 min of speech
const CONTEXT_OVERLAP = 200       // keep last N chars on flush to avoid cutting sentences

class TranscriptBuffer {
  constructor () {
    this._buf = ''
    this.isProcessing = false
  }

  /**
   * Append a new transcript chunk.
   * @returns {{ ready: boolean, charsBuffered: number }}
   */
  append (text) {
    this._buf += ' ' + text.trim()
    return {
      ready: this._buf.length >= MIN_CHARS_TO_PROCESS && !this.isProcessing,
      charsBuffered: this._buf.length
    }
  }

  /**
   * Returns the text to analyse and retains a context-overlap tail.
   * Must only be called when ready === true.
   */
  flush () {
    const text = this._buf
    this._buf = text.length > CONTEXT_OVERLAP
      ? text.slice(-CONTEXT_OVERLAP)
      : ''
    return text
  }

  /** Clear everything (on disconnect / stop message). */
  reset () {
    this._buf = ''
    this.isProcessing = false
  }

  get length () { return this._buf.length }
  get threshold () { return MIN_CHARS_TO_PROCESS }
}

module.exports = { TranscriptBuffer, MIN_CHARS_TO_PROCESS }
