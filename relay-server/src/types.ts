export interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  source?: string;
  confidence?: number;
  language?: string;
}

export interface FrameMeta {
  id: string;
  timestamp: number;
  sizeBytes: number;
}

export interface FrameEntry {
  meta: FrameMeta;
  data: Buffer;
  base64: string;
}

export interface WsFrameMessage {
  type: "frame";
  id: string;
  timestamp: number;
  sizeBytes: number;
  data: string; // base64
}

export interface WsTranscriptMessage {
  type: "transcript";
  id: string;
  text: string;
  timestamp: number;
  source?: string;
  confidence?: number;
  language?: string;
}

export interface WsHistoryMessage {
  type: "history";
  entries: TranscriptSegment[];
}

export interface HealthResponse {
  status: "ok";
  uptimeS: number;
  framesIngested: number;
  transcriptsIngested: number;
  frameSubscribers: number;
  transcriptSubscribers: number;
}
