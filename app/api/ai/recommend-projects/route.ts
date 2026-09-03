import { NextResponse } from "next/server";
import { recommendProjects } from "@/lib/ai/recommend-projects";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const recommendations = await recommendProjects(body);

    return NextResponse.json({ recommendations });
  } catch {
    return NextResponse.json(
      { error: "Failed to recommend projects." },
      { status: 500 }
    );
  }
}
