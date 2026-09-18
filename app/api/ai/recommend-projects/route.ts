import { NextResponse } from "next/server";
import { recommendProjects } from "@/lib/ai/recommend-projects";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const supabase = await createClient();
    const recommendations = await recommendProjects(supabase, body);

    return NextResponse.json({ recommendations });
  } catch (error) {
    console.error("Recommend projects error:", error);

    return NextResponse.json(
      { error: "Failed to recommend projects." },
      { status: 500 }
    );
  }
}
