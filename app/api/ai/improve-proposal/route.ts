import { NextResponse } from "next/server";
import { improveProposal } from "@/lib/ai/improve-proposal";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const improvement = await improveProposal(body);

    return NextResponse.json({ improvement });
  } catch {
    return NextResponse.json(
      { error: "Failed to improve proposal." },
      { status: 500 }
    );
  }
}
