import type { ProfileAnalysis } from "@/types/ai";

interface ProfileInput {
  name?: string;
  bio?: string;
  skills?: string[];
  portfolioCount?: number;
  avatar?: string;
}

export async function analyzeProfile(input: ProfileInput): Promise<ProfileAnalysis> {
  await delay(600);

  const missingFields: string[] = [];
  const suggestions: string[] = [];
  const skillInsights: string[] = [];

  if (!input.avatar) missingFields.push("Profile photo");
  if (!input.bio || input.bio.length < 80) missingFields.push("Detailed bio");
  if (!input.skills?.length) missingFields.push("Skills list");
  if (!input.portfolioCount) missingFields.push("Portfolio projects");

  if (missingFields.includes("Profile photo")) {
    suggestions.push("Add a professional profile photo to increase trust");
  }

  if (missingFields.includes("Detailed bio")) {
    suggestions.push("Expand your bio to at least 80 characters describing your expertise");
  }

  if (missingFields.includes("Portfolio projects")) {
    suggestions.push("Upload 2-3 portfolio pieces to showcase your work quality");
  }

  if (input.skills && input.skills.length > 0) {
    skillInsights.push(`Your top skills (${input.skills.slice(0, 3).join(", ")}) align with high-demand project categories`);
  } else {
    skillInsights.push("Adding specific skills helps CollaCrew match you to relevant projects");
  }

  const strength = Math.max(40, 100 - missingFields.length * 15);

  return {
    strength,
    missingFields,
    skillInsights,
    suggestions,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
