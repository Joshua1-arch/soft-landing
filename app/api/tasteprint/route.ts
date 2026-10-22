import { NextRequest, NextResponse } from "next/server";
import { runTasteprintAgent } from "@/lib/tasteprint/agent.ts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawLoves = Array.isArray(body.loves) ? body.loves : [];
    const locationQuery = typeof body.location === "string" && body.location.trim() ? body.location.trim() : "London";
    const coordinates = body.coordinates && typeof body.coordinates.lat === "number" && typeof body.coordinates.lon === "number"
      ? body.coordinates
      : undefined;

    // Filter non-empty strings
    const loves = rawLoves
      .map((s: any) => (typeof s === "string" ? s.trim() : ""))
      .filter((s: string) => s.length > 0)
      .slice(0, 4);

    if (loves.length === 0) {
      return NextResponse.json(
        { error: "Please provide at least one favorite thing (up to 4)." },
        { status: 400 }
      );
    }

    const apiKey = process.env.QLOO_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server missing QLOO_API_KEY configuration." },
        { status: 500 }
      );
    }

    const result = await runTasteprintAgent({
      loves,
      locationQuery,
      coordinates,
      apiKey,
      baseUrl: process.env.QLOO_BASE_URL || "https://hackathon.api.qloo.com",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[/api/tasteprint error]", error);
    return NextResponse.json(
      { error: "Failed to generate Tasteprint", details: error?.message },
      { status: 500 }
    );
  }
}
