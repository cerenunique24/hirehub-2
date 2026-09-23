import { NextResponse } from "next/server";
import { recommendCrew } from "@/lib/ai/recommend-crew";
import type { ProjectAnalysis, TalentMatchingResult } from "@/types/ai";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Ekip önerisi için giriş yapmalısınız." },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      analysis?: ProjectAnalysis;
      matching?: TalentMatchingResult;
    };

    if (!body.analysis) {
      return NextResponse.json(
        { error: "Project analysis is required." },
        { status: 400 }
      );
    }

    const crew = await recommendCrew(body.analysis, body.matching);

    return NextResponse.json({ crew });
  } catch {
    return NextResponse.json(
      { error: "Failed to recommend crew." },
      { status: 500 }
    );
  }
}
