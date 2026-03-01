import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/mistral", () => ({
  describeFrame: vi.fn(),
}));

import { POST } from "../route";
import { describeFrame } from "@/lib/services/mistral";

const mockDescribeFrame = describeFrame as ReturnType<typeof vi.fn>;

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/vision", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("POST /api/vision", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 400 on missing frame", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toContain("frame");
  });

  it("strips data URL prefix before calling describeFrame", async () => {
    mockDescribeFrame.mockResolvedValue("A crowd cheering");

    const res = await POST(
      makeRequest({ frame: "data:image/jpeg;base64,abc123" })
    );
    expect(res.status).toBe(200);
    expect(mockDescribeFrame).toHaveBeenCalledWith("abc123");
  });

  it("returns description on success", async () => {
    mockDescribeFrame.mockResolvedValue("Person at podium");

    const res = await POST(makeRequest({ frame: "rawbase64data" }));
    const data = await res.json();
    expect(data.description).toBe("Person at podium");
  });

  it("returns 500 on error", async () => {
    mockDescribeFrame.mockRejectedValue(new Error("Vision API down"));

    const res = await POST(makeRequest({ frame: "data" }));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toContain("Vision API down");
  });
});
