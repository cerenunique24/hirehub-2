import { projects } from "@/mocks/projects";
import type { ProjectRecommendation } from "@/types/ai";

interface FreelancerProfile {
  skills?: string[];
}

export async function recommendProjects(
  profile: FreelancerProfile
): Promise<ProjectRecommendation[]> {
  await delay(700);

  const userSkills = (profile.skills ?? []).map((s) => s.toLowerCase());

  return projects.map((project) => {
    const overlap = project.requiredSkills.filter((skill) =>
      userSkills.some(
        (userSkill) =>
          skill.toLowerCase().includes(userSkill) ||
          userSkill.includes(skill.toLowerCase())
      )
    );

    const matchScore = Math.min(96, 55 + overlap.length * 15);

    return {
      projectId: project.id,
      title: project.title,
      matchScore,
      reasons: [
        overlap.length > 0
          ? `Matches your skills: ${overlap.join(", ")}`
          : "Expands your project portfolio",
        `Budget: ₺${project.budget.toLocaleString("tr-TR")}`,
        project.recommendation === "coalition"
          ? "Coalition-friendly project"
          : "Individual freelancer opportunity",
      ],
      relevantSkills: overlap.length > 0 ? overlap : project.requiredSkills.slice(0, 2),
      budget: project.budget,
    };
  }).sort((a, b) => b.matchScore - a.matchScore);
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
