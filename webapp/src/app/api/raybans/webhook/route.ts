import { NextRequest, NextResponse } from "next/server";

export interface RayBansWebhookPayload {
  frame?: string; // base64 JPEG or URL
  transcript: string; // speech-to-text chunk
  timestamp: number;
}

// In-memory buffer for recent data (will be replaced with WS broadcast)
const recentTranscripts: { text: string; timestamp: number }[] = [];
let latestFrame: string | null = null;
const MAX_TRANSCRIPTS = 100;

// Threshold for triggering Mistral analysis (chars of transcript)
const ANALYSIS_THRESHOLD = 500;
let pendingTranscriptBuffer = "";

export async function POST(request: NextRequest) {
  try {
    const payload: RayBansWebhookPayload = await request.json();

    if (!payload.transcript && !payload.frame) {
      return NextResponse.json(
        { error: "Missing transcript or frame" },
        { status: 400 }
      );
    }

    // Store frame if provided
    if (payload.frame) {
      latestFrame = payload.frame;
    }

    // Store transcript chunk
    if (payload.transcript) {
      const chunk = {
        text: payload.transcript,
        timestamp: payload.timestamp ?? Date.now(),
      };

      recentTranscripts.push(chunk);
      if (recentTranscripts.length > MAX_TRANSCRIPTS) {
        recentTranscripts.shift();
      }

      // Accumulate for analysis threshold
      pendingTranscriptBuffer += " " + payload.transcript;

      // Check if we should trigger analysis
      let shouldAnalyze = false;
      if (pendingTranscriptBuffer.length >= ANALYSIS_THRESHOLD) {
        shouldAnalyze = true;
        // Reset buffer after triggering
        const transcriptForAnalysis = pendingTranscriptBuffer.trim();
        pendingTranscriptBuffer = "";

        // Trigger async analysis (non-blocking)
        triggerAnalysis(transcriptForAnalysis).catch(console.error);
      }

      // TODO: Broadcast to WebSocket clients
      // wsServer.broadcast({ type: "TRANSCRIPT_CHUNK", payload: chunk });

      return NextResponse.json({
        success: true,
        analysisTriggered: shouldAnalyze,
        transcriptCount: recentTranscripts.length,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Invalid payload" },
      { status: 400 }
    );
  }
}

// GET endpoint to retrieve recent data
export async function GET() {
  return NextResponse.json({
    transcripts: recentTranscripts.slice(-50),
    hasFrame: latestFrame !== null,
    pendingBufferLength: pendingTranscriptBuffer.length,
  });
}

async function triggerAnalysis(transcript: string) {
  try {
    // Call the Mistral analysis endpoint
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/analysis/mistral`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      }
    );

    if (!response.ok) {
      console.error("Analysis failed:", response.statusText);
      return;
    }

    // Stream response handling would go here
    // For now, log that analysis was triggered
    console.log("Mistral analysis triggered for", transcript.length, "chars");

    // TODO: Broadcast analysis result to WS clients
    // const result = await response.json();
    // wsServer.broadcast({ type: "ANALYSIS_RESULT", payload: result });
  } catch (error) {
    console.error("Analysis trigger error:", error);
  }
}
