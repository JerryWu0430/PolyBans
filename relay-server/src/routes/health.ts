import { Router } from "express";
import { state } from "../state";
import { getSubscriberCounts } from "../ws/handler";
import { HealthResponse } from "../types";

const router = Router();

router.get("/health", (req, res) => {
  const { frameSubscribers, transcriptSubscribers } = getSubscriberCounts();

  const health: HealthResponse = {
    status: "ok",
    uptimeS: state.uptimeS,
    framesIngested: state.framesIngested,
    transcriptsIngested: state.transcriptsIngested,
    frameSubscribers,
    transcriptSubscribers,
  };

  res.json(health);
});

export default router;
