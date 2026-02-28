import { Router } from "express";
import { state } from "../state";

const router = Router();

// GET /frames/latest — return latest JPEG as image/jpeg
router.get("/frames/latest", (req, res) => {
  const entry = state.latestFrame();
  if (!entry) {
    res.status(404).json({ error: "No frames ingested yet." });
    return;
  }
  res.set("Content-Type", "image/jpeg");
  res.set("X-Frame-Id", entry.meta.id);
  res.send(entry.data);
});

// GET /frames/latest/meta — JSON metadata of latest frame
router.get("/frames/latest/meta", (req, res) => {
  const entry = state.latestFrame();
  if (!entry) {
    res.status(404).json({ error: "No frames ingested yet." });
    return;
  }
  res.json(entry.meta);
});

// GET /transcript — query param ?limit=50
router.get("/transcript", (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit as string) || 50, 1), 500);
  const entries = state.recentTranscripts(limit);
  res.json({ count: entries.length, entries });
});

// GET /transcript/latest — most recent segment
router.get("/transcript/latest", (req, res) => {
  const entry = state.latestTranscript();
  if (!entry) {
    res.status(404).json({ error: "No transcripts ingested yet." });
    return;
  }
  res.json(entry);
});

// GET /transcript/full — all transcript text concatenated
router.get("/transcript/full", (req, res) => {
  const segments = state.allTranscripts();
  const text = segments.map((s) => s.text).join(" ");
  res.json({ text, segments: segments.length });
});

export default router;
