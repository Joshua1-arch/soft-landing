import { NextRequest, NextResponse } from "next/server";
import { getQlooAdapter } from "@/lib/qloo";
import { PERSONAS } from "@/lib/qloo/fixtures/personas.ts";
import { sequencePlan } from "@/lib/sequence.ts";
import type { UserPreferences } from "@/lib/qloo/types.ts";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const personaId = body.personaId as string | undefined;

    let origin = body.origin as string;
    let destination = body.destination as string;
    let anchors = (body.anchors as string[]) || [];
    let constraints = (body.constraints as string[]) || [];
    let adventure = typeof body.adventure === "number" ? body.adventure : 50;

    // If pre-seeded persona selected
    if (personaId && PERSONAS[personaId]) {
      const p = PERSONAS[personaId];
      origin = p.origin;
      destination = p.destination;
      anchors = p.anchors;
      constraints = p.constraints;
      adventure = p.adventure;
    }

    if (!origin || !destination || anchors.length === 0) {
      // Default to Amara
      const p = PERSONAS.amara;
      origin = p.origin;
      destination = p.destination;
      anchors = p.anchors;
      constraints = p.constraints;
      adventure = p.adventure;
    }

    const adapter = getQlooAdapter();

    // 1. Resolve anchor entities or generate synthetic IDs
    const resolvedAnchorIds = anchors.map((a, i) => `anchor_${i + 1}_${encodeURIComponent(a.slice(0, 8))}`);

    // 2. Compute Culture-Gap Readout
    const gapReadout = await adapter.computeCultureGap(origin, destination, anchors);

    // 3. Retrieve full candidate pool
    const selectedKey = personaId && PERSONAS[personaId] ? personaId : "amara";
    const candidatePool = await adapter.getFullCandidatePool(selectedKey);

    const user: UserPreferences = {
      originCity: origin,
      destinationCity: destination,
      anchors,
      resolvedAnchorIds,
      constraints,
      adventure,
      lovedTags: [],
      avoidTags: [],
      penalizedDomains: {
        music: 0,
        food: 0,
        film: 0,
        books: 0,
        podcasts: 0,
        places: 0,
      },
    };

    // 4. Sequence the 12-week plan
    const weeks = sequencePlan({
      user,
      candidatePool,
    });

    const isMock = !process.env.QLOO_API_KEY || process.env.QLOO_MODE === "mock";

    return NextResponse.json({
      user,
      gapReadout,
      weeks,
      candidatePool,
      isMock,
      personaId: selectedKey,
    });
  } catch (error: any) {
    console.error("[/api/bootstrap error]", error);
    return NextResponse.json(
      { error: "Failed to bootstrap cultural plan", details: error?.message },
      { status: 500 }
    );
  }
}
