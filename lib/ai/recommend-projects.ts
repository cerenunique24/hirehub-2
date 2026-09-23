import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProjectRecommendation } from "@/types/ai";
import { matchSkills } from "@/lib/matching";

interface FreelancerProfile {
  skills?: string[];
}

/**
 * Gerçek açık (status = "open") projeler üzerinden freelancer'ın
 * skill'leriyle eşleşme skoru hesaplar. Mock veri kullanmaz.
 */
export async function recommendProjects(
  supabase: SupabaseClient,
  profile: FreelancerProfile
): Promise<ProjectRecommendation[]> {
  const freelancerSkills = (profile.skills ?? []).filter(
    (skill): skill is string => typeof skill === "string" && skill.trim().length > 0
  );

  const { data, error } = await supabase
    .from("projects")
    .select("id, title, skills, budget")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    throw error;
  }

  const rows = data ?? [];

  return rows
    .map((project) => {
      const projectSkills = Array.isArray(project.skills)
        ? project.skills.filter(
            (skill): skill is string => typeof skill === "string"
          )
        : [];

      const { matchingSkills, percentage } = matchSkills(
        projectSkills,
        freelancerSkills
      );

      const budget =
        typeof project.budget === "number"
          ? project.budget
          : Number(project.budget ?? 0) || 0;

      return {
        projectId: project.id as string,
        title: project.title as string,
        matchScore: percentage,
        reasons: [
          matchingSkills.length > 0
            ? `Becerilerinle eşleşiyor: ${matchingSkills.join(", ")}`
            : "Yeni bir alanda deneyim kazanma fırsatı",
          budget > 0
            ? `Bütçe: ₺${budget.toLocaleString("tr-TR")}`
            : "Bütçe belirtilmemiş",
        ],
        relevantSkills:
          matchingSkills.length > 0
            ? matchingSkills
            : projectSkills.slice(0, 2),
        budget,
      };
    })
    .filter((project) => project.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 10);
}
