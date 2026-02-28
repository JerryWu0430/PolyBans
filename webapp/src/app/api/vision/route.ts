import { NextRequest, NextResponse } from "next/server";
import { describeFrame } from "@/lib/services/mistral";

// Allow up to 8 MB bodies (raw camera frames can be large)
export const maxDuration = 30;

export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as { frame?: string };

        if (!body.frame || typeof body.frame !== "string") {
            return NextResponse.json({ error: "frame (base64) is required" }, { status: 400 });
        }

        // Strip data URL prefix if present
        const base64 = body.frame.replace(/^data:image\/[a-z]+;base64,/, "");

        const description = await describeFrame(base64);

        return NextResponse.json({ description });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("[api/vision] Error:", message);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
