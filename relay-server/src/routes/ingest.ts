import { Router, Request, Response, NextFunction } from "express";
import multer, { MulterError } from "multer";
import { v4 as uuidv4 } from "uuid";
import { state } from "../state";
import { broadcastFrame, broadcastTranscript } from "../ws/handler";
import { FrameEntry, WsFrameMessage, WsTranscriptMessage, TranscriptSegment } from "../types";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

// POST /ingest/frame — multipart JPEG
router.post("/frame", upload.single("frame"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded. Use field name 'frame'." });
    return;
  }

  const id = uuidv4().slice(0, 8);
  const timestamp = Date.now();
  const data = req.file.buffer;
  const base64 = data.toString("base64");

  const entry: FrameEntry = {
    meta: { id, timestamp, sizeBytes: data.length },
    data,
    base64,
  };

  state.addFrame(entry);

  const wsMsg: WsFrameMessage = {
    type: "frame",
    id,
    timestamp,
    sizeBytes: data.length,
    data: base64,
  };
  broadcastFrame(wsMsg);

  res.status(200).json({ id, timestamp, sizeBytes: data.length });
});

// POST /ingest/transcript — JSON body
router.post("/transcript", (req, res) => {
  const { text, timestamp, source, confidence, language } = req.body;

  if (!text || typeof text !== "string") {
    res.status(400).json({ error: "Field 'text' is required and must be a string." });
    return;
  }

  const id = uuidv4().slice(0, 8);
  const ts = timestamp ?? Date.now();

  const segment: TranscriptSegment = {
    id,
    text,
    timestamp: ts,
    ...(source !== undefined && { source }),
    ...(confidence !== undefined && { confidence }),
    ...(language !== undefined && { language }),
  };

  state.addTranscript(segment);

  const wsMsg: WsTranscriptMessage = {
    type: "transcript",
    ...segment,
  };
  broadcastTranscript(wsMsg);

  res.status(200).json(segment);
});

// Catch multer errors (wrong field name, file too large) and return 400 instead of 500
router.use((err: Error, _req: Request, res: Response, next: NextFunction) => {
  if (err instanceof MulterError) {
    res.status(400).json({ error: err.message });
    return;
  }
  next(err);
});

export default router;
