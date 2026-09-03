import { NextResponse } from "next/server";
import { analyzeProject } from "@/lib/ai/analyze-project";
import type { ProjectBrief } from "@/types/ai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ProjectBrief>;

    if (!body.description?.trim()) {
      return NextResponse.json(
        { error: "Project description is required." },
        { status: 400 }
      );
    }

    const brief: ProjectBrief = {
      title: body.title ?? "",
      description: body.description,
      goals: body.goals,
      context: body.context,
      requirements: body.requirements,
      budget: body.budget ?? "",
      deadline: body.deadline ?? "",
    };

    const analysis = await analyzeProject(brief);

    return NextResponse.json({ analysis });
  } catch {
    return NextResponse.json(
      { error: "Failed to analyze project." },
      { status: 500 }
    );
  }
}
