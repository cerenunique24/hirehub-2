import { NextResponse } from "next/server";
import { matchTalent } from "@/lib/ai/match-talent";
import type { ProjectAnalysis } from "@/types/ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { analysis?: ProjectAnalysis };

    if (!body.analysis) {
      return NextResponse.json(
        { error: "Project analysis is required." },
        { status: 400 }
      );
    }

    const matching = await matchTalent(body.analysis);

    return NextResponse.json({ matching });
  } catch {
    return NextResponse.json(
      { error: "Failed to match talent." },
      { status: 500 }
    );
  }
}
