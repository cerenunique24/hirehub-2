import { NextResponse } from "next/server";
import { analyzeProfile } from "@/lib/ai/analyze-profile";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const analysis = await analyzeProfile(body);

    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze profile." },
      { status: 500 }
    );
  }
}
