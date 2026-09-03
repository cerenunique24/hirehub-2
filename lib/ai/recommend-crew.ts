import type {
  CrewRecommendation,
  ProjectAnalysis,
  TalentMatchingResult,
} from "@/types/ai";

export async function recommendCrew(
  analysis: ProjectAnalysis,
  talent?: TalentMatchingResult
): Promise<CrewRecommendation> {
  await delay(900);

  const topFreelancers = talent?.recommendedFreelancers.slice(0, 3) ?? [];
  const members = analysis.requiredRoles.map((role, index) => {
    const match = topFreelancers[index];

    return {
      role,
      userId: match?.userId,
      name: match?.name ?? `Recommended ${role}`,
      skills: match?.skills.slice(0, 3) ?? analysis.requiredSkills.slice(0, 2),
      reason: match
        ? `Selected for ${role} based on skill match (${match.matchScore}% relevance)`
        : `AI-suggested ${role} to cover project requirements`,
    };
  });

  return {
    members,
    totalEstimatedCost: analysis.estimatedBudget,
    estimatedDuration: analysis.estimatedTimeline,
    summary: `CollaCrew recommends a ${members.length}-person crew for this ${analysis.complexity.toLowerCase()}-complexity ${analysis.category.toLowerCase()} project. Each member covers a distinct role — review and adjust before publishing.`,
    confidence: analysis.complexity === "High" ? 82 : analysis.complexity === "Medium" ? 88 : 91,
  };
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
