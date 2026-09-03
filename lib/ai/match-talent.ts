import { coalitions } from "@/mocks/coalitions";
import { users } from "@/mocks/users";
import type { ProjectAnalysis, TalentMatchingResult } from "@/types/ai";

export async function matchTalent(
  analysis: ProjectAnalysis
): Promise<TalentMatchingResult> {
  await delay(800);

  const requiredSkills = analysis.requiredSkills.map((s) => s.toLowerCase());

  const recommendedFreelancers = users.map((user) => {
    const skills = inferFreelancerSkills(user.username);
    const overlap = skills.filter((skill) =>
      requiredSkills.some(
        (required) =>
          skill.toLowerCase().includes(required) ||
          required.includes(skill.toLowerCase())
      )
    );

    const matchScore = Math.min(95, 60 + overlap.length * 12);

    return {
      userId: user.id,
      name: `${user.name} ${user.surname}`,
      username: user.username,
      avatar: user.avatar,
      skills,
      matchScore,
      reasons: buildFreelancerReasons(overlap, analysis),
      hourlyRate: "₺750 / saat",
    };
  }).sort((a, b) => b.matchScore - a.matchScore);

  const recommendedCoalitions = coalitions.map((coalition) => {
    const overlap = coalition.skills.filter((skill) =>
      requiredSkills.some(
        (required) =>
          skill.toLowerCase().includes(required) ||
          required.includes(skill.toLowerCase())
      )
    );

    const matchScore = Math.min(98, coalition.aiScore - 10 + overlap.length * 5);

    return {
      coalitionId: coalition.id,
      name: coalition.name,
      skills: coalition.skills,
      matchScore,
      reasons: [
        `Strong overlap with ${overlap.length} required skills`,
        `${coalition.completedProjects} completed projects`,
        `Rated ${coalition.rating}/5 by clients`,
      ],
      memberCount: coalition.members.length,
      rating: coalition.rating,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);

  return {
    recommendedFreelancers,
    recommendedCoalitions,
  };
}

function inferFreelancerSkills(username: string): string[] {
  const skillMap: Record<string, string[]> = {
    ahmetylmz: ["Next.js", "React", "TypeScript", "Frontend Development"],
    zeynepdmr: ["UI Design", "Figma", "UX Research", "Design Systems"],
  };

  return skillMap[username] ?? ["General Freelance", "Communication"];
}

function buildFreelancerReasons(
  overlap: string[],
  analysis: ProjectAnalysis
): string[] {
  const reasons: string[] = [];

  if (overlap.length > 0) {
    reasons.push(`Matches ${overlap.length} required skills: ${overlap.join(", ")}`);
  }

  reasons.push(`Relevant for ${analysis.category} projects`);
  reasons.push("Available for collaboration");

  return reasons;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
