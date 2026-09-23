import type { SupabaseClient } from "@supabase/supabase-js";

import { matchFreelancerToProjectRoles, type FreelancerRoleMatch } from "@/lib/ai/match-talent";
import { matchSkills } from "@/lib/matching";
import { canUseFeature, FEATURE_MATRIX, type AccessContext, type FeatureKey, type PlanTier } from "@/lib/premium";
import { normalizeStringArray } from "@/lib/utils/normalizeStringArray";

/**
 * CollaCrew AI workspaces (client + freelancer).
 *
 * Everything here is computed from real Supabase data with the same
 * deterministic role-matching engine used by Discover and proposals
 * (matchFreelancerToProjectRoles). Plan gating happens HERE, on the server,
 * from the real subscription (AccessContext) — locked sections are simply not
 * included in the response, only a `locked` descriptor is returned.
 */

export const STRONG_MATCH_SCORE = 75;

export type LockedFeature = { key: FeatureKey; label: string; requiredPlan: PlanTier };

function lockedFeature(key: FeatureKey): LockedFeature {
  const rule = FEATURE_MATRIX[key];
  return { key, label: rule.label, requiredPlan: rule.minPlan };
}

/** "A. B. C." → "A." — the basic (Free) explanation is the first reason only. */
function firstReason(reason: string): string {
  const first = reason.split(/(?<=\.)\s+/)[0]?.trim() ?? "";
  return first || reason;
}

type BudgetRole = {
  roleId?: string;
  role?: string;
  requiredSkills?: unknown;
  skills?: unknown;
  preferredSkills?: unknown;
  memberCount?: number;
};

function readRoles(budgetBreakdown: unknown): BudgetRole[] {
  return Array.isArray(budgetBreakdown) ? (budgetBreakdown as BudgetRole[]) : [];
}

function roleSkills(role: BudgetRole | undefined): string[] {
  if (!role) return [];
  return normalizeStringArray([
    ...normalizeStringArray(role.requiredSkills),
    ...normalizeStringArray(role.skills),
  ]);
}

/* -------------------------------------------------------------------------- */
/* Client workspace                                                            */
/* -------------------------------------------------------------------------- */

export type ClientCandidate = {
  freelancerId: string;
  name: string;
  title: string | null;
  score: number;
  reason: string;
  matchingSkills?: string[];
  missingSkills?: string[];
  isBackup?: boolean;
};

export type ClientRoleInsight = {
  roleId: string;
  role: string;
  requiredSkills: string[];
  eligibleCount: number;
  coverage?: "covered" | "thin" | "uncovered";
  candidates: ClientCandidate[];
};

export type ClientWorkspace = {
  plan: PlanTier;
  projects: { id: string; title: string; status: string | null }[];
  project: { id: string; title: string; status: string | null; category: string | null } | null;
  summary: { eligibleFreelancers: number; strongMatches: number; suggestedRoles: number };
  roles: ClientRoleInsight[];
  optimizations?: string[];
  locked: LockedFeature[];
};

export async function buildClientWorkspace(
  supabase: SupabaseClient,
  context: AccessContext,
  requestedProjectId: string | null
): Promise<ClientWorkspace> {
  const plus = canUseFeature(context, "ai_freelancer_shortlist");
  const pro = canUseFeature(context, "advanced_ai_shortlist");
  const deep = canUseFeature(context, "deep_talent_analysis");
  const teamInsights = canUseFeature(context, "team_insights");
  const backups = canUseFeature(context, "backup_talent_suggestions");

  const locked: LockedFeature[] = [];
  if (!plus) locked.push(lockedFeature("ai_freelancer_shortlist"));
  if (!pro) locked.push(lockedFeature("advanced_ai_shortlist"));
  if (!deep) locked.push(lockedFeature("deep_talent_analysis"));
  if (!teamInsights) locked.push(lockedFeature("team_insights"));

  const perRoleLimit = pro ? 10 : plus ? 5 : 3;

  const { data: projects } = await supabase
    .from("projects")
    .select("id, title, status, category, budget_breakdown, created_at")
    .eq("client_id", context.userId!)
    .order("created_at", { ascending: false });

  const projectList = (projects ?? []).map((p) => ({ id: p.id, title: p.title, status: p.status }));
  const project =
    (projects ?? []).find((p) => p.id === requestedProjectId) ??
    (projects ?? []).find((p) => p.status === "open" || p.status === "ready_to_start") ??
    (projects ?? [])[0] ??
    null;

  const empty: ClientWorkspace = {
    plan: context.plan,
    projects: projectList,
    project: null,
    summary: { eligibleFreelancers: 0, strongMatches: 0, suggestedRoles: 0 },
    roles: [],
    locked,
  };

  if (!project) return empty;

  const budgetRoles = readRoles(project.budget_breakdown);

  const { data: freelancers } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, title")
    .eq("role", "freelancer")
    .limit(200);

  const scored = await Promise.all(
    (freelancers ?? []).map(async (freelancer) => {
      try {
        const matches = await matchFreelancerToProjectRoles(supabase, project.id, freelancer.id);
        return { freelancer, matches };
      } catch (error) {
        console.error(`[AI workspace] match error for freelancer ${freelancer.id}:`, error);
        return { freelancer, matches: [] as FreelancerRoleMatch[] };
      }
    })
  );

  // Role list comes from the matching engine so single-freelancer projects
  // (fallback role) are handled exactly like everywhere else.
  const roleOrder = new Map<string, string>();
  for (const { matches } of scored) {
    for (const match of matches) roleOrder.set(match.roleId, match.role);
  }
  for (const role of budgetRoles) {
    if (role.roleId && role.role && !roleOrder.has(role.roleId)) roleOrder.set(role.roleId, role.role);
  }

  const eligibleIds = new Set<string>();
  const strongIds = new Set<string>();

  const roles: ClientRoleInsight[] = [...roleOrder.entries()].map(([roleId, roleName]) => {
    const required = roleSkills(budgetRoles.find((role) => role.roleId === roleId));

    const eligible = scored
      .map(({ freelancer, matches }) => ({ freelancer, match: matches.find((m) => m.roleId === roleId) }))
      .filter((item): item is { freelancer: typeof item.freelancer; match: FreelancerRoleMatch } =>
        Boolean(item.match?.isEligibleForRole)
      )
      .sort((a, b) => b.match.score - a.match.score);

    for (const { freelancer, match } of eligible) {
      eligibleIds.add(freelancer.id);
      if (match.score >= STRONG_MATCH_SCORE) strongIds.add(freelancer.id);
    }

    const candidates: ClientCandidate[] = eligible.slice(0, perRoleLimit).map(({ freelancer, match }, index) => {
      const matching = match.matchingSkills ?? [];
      const candidate: ClientCandidate = {
        freelancerId: freelancer.id,
        name: [freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ") || "Freelancer",
        title: freelancer.title,
        score: match.score,
        reason: plus ? match.reason : firstReason(match.reason),
      };
      if (plus) candidate.matchingSkills = matching;
      if (deep && required.length > 0) {
        candidate.missingSkills = required.filter((skill) => matchSkills([skill], matching).matchingSkills.length === 0);
      }
      if (backups && index > 0) candidate.isBackup = true;
      return candidate;
    });

    const insight: ClientRoleInsight = {
      roleId,
      role: roleName,
      requiredSkills: required,
      eligibleCount: eligible.length,
      candidates,
    };

    if (teamInsights) {
      insight.coverage = eligible.length === 0 ? "uncovered" : eligible.length < 2 ? "thin" : "covered";
    }

    return insight;
  });

  const workspace: ClientWorkspace = {
    plan: context.plan,
    projects: projectList,
    project: { id: project.id, title: project.title, status: project.status, category: project.category },
    summary: {
      eligibleFreelancers: eligibleIds.size,
      strongMatches: strongIds.size,
      suggestedRoles: roles.length,
    },
    roles,
    locked,
  };

  // Project optimisation (Pro): factual, derived from the coverage above.
  if (teamInsights) {
    workspace.optimizations = roles.flatMap((role) => {
      if (role.eligibleCount === 0) {
        return [
          `"${role.role}" için şu an uygun freelancer yok. Rol adını veya gerekli becerileri (${
            role.requiredSkills.slice(0, 3).join(", ") || "tanımlı değil"
          }) gözden geçirmek havuzu genişletebilir.`,
        ];
      }
      if (role.eligibleCount === 1) {
        return [`"${role.role}" için yalnızca 1 uygun aday var; yedek seçenek için gerekli becerileri esnetmeyi düşünebilirsin.`];
      }
      return [];
    });
  }

  return workspace;
}

/* -------------------------------------------------------------------------- */
/* Freelancer workspace                                                        */
/* -------------------------------------------------------------------------- */

export type FreelancerRecommendation = {
  projectId: string;
  title: string;
  category: string | null;
  role: string;
  roleId: string;
  score: number;
  reason: string;
  matchingSkills?: string[];
  budgetPerPerson?: number;
  duration?: string;
};

export type ProfileSuggestion = { id: string; text: string };

export type FreelancerWorkspace = {
  plan: PlanTier;
  summary: { suitableProjects: number; strongMatches: number; insights: number };
  recommendations: FreelancerRecommendation[];
  nearMatches?: FreelancerRecommendation[];
  profile: {
    completion: number | null;
    suggestions?: ProfileSuggestion[];
    strengths?: { skill: string; count: number }[];
    skillGap?: { skill: string; count: number }[];
    visibility?: { eligibleRoles: number; totalOpenRoles: number; averageScore: number | null };
  };
  locked: LockedFeature[];
};

export async function buildFreelancerWorkspace(
  supabase: SupabaseClient,
  context: AccessContext
): Promise<FreelancerWorkspace> {
  const explanations = canUseFeature(context, "matching_explanation");
  const profileAnalytics = canUseFeature(context, "profile_analytics");
  const advancedMatching = canUseFeature(context, "advanced_matching");
  const advancedInsights = canUseFeature(context, "advanced_profile_insights");

  const locked: LockedFeature[] = [];
  if (!explanations) locked.push(lockedFeature("matching_explanation"));
  if (!canUseFeature(context, "proposal_ai")) locked.push(lockedFeature("proposal_ai"));
  if (!profileAnalytics) locked.push(lockedFeature("profile_analytics"));
  if (!advancedMatching) locked.push(lockedFeature("advanced_matching"));
  if (!advancedInsights) locked.push(lockedFeature("advanced_profile_insights"));

  const limit = advancedMatching ? 12 : explanations ? 6 : 3;
  const userId = context.userId!;

  const [{ data: openProjects }, { data: profile }, { data: portfolio }] = await Promise.all([
    supabase
      .from("projects")
      .select("id, title, category, status, budget_breakdown")
      .in("status", ["open", "ready_to_start"]),
    supabase
      .from("profiles")
      .select("title, bio, skills, expertise, availability_status, profile_completion")
      .eq("id", userId)
      .single(),
    supabase.from("portfolio_items").select("description").eq("freelancer_id", userId),
  ]);

  const perProject = await Promise.all(
    (openProjects ?? []).map(async (project) => {
      try {
        return { project, matches: await matchFreelancerToProjectRoles(supabase, project.id, userId) };
      } catch (error) {
        console.error(`[AI workspace] match error for project ${project.id}:`, error);
        return { project, matches: [] as FreelancerRoleMatch[] };
      }
    })
  );

  const toRecommendation = (
    project: { id: string; title: string; category: string | null },
    match: FreelancerRoleMatch
  ): FreelancerRecommendation => {
    const item: FreelancerRecommendation = {
      projectId: project.id,
      title: project.title,
      category: project.category,
      role: match.role,
      roleId: match.roleId,
      score: match.score,
      reason: explanations ? match.reason : firstReason(match.reason),
    };
    // Budget/duration are only present for eligible roles (engine rule).
    if (match.budgetPerPerson) item.budgetPerPerson = match.budgetPerPerson;
    if (match.duration) item.duration = match.duration;
    if (explanations && match.matchingSkills) item.matchingSkills = match.matchingSkills;
    return item;
  };

  const eligible = perProject
    .flatMap(({ project, matches }) =>
      matches.filter((m) => m.isEligibleForRole).map((match) => toRecommendation(project, match))
    )
    .sort((a, b) => b.score - a.score);

  // Best role per project for the list.
  const seen = new Set<string>();
  const recommendations = eligible.filter((item) => {
    if (seen.has(item.projectId)) return false;
    seen.add(item.projectId);
    return true;
  });

  const workspace: FreelancerWorkspace = {
    plan: context.plan,
    summary: {
      suitableProjects: recommendations.length,
      strongMatches: recommendations.filter((item) => item.score >= STRONG_MATCH_SCORE).length,
      insights: 0,
    },
    recommendations: recommendations.slice(0, limit),
    profile: { completion: profile?.profile_completion ?? null },
    locked,
  };

  if (advancedMatching) {
    // Roles that are close but not yet eligible — no budget is exposed for these.
    workspace.nearMatches = perProject
      .flatMap(({ project, matches }) =>
        matches
          .filter((m) => !m.isEligibleForRole && m.score >= 25)
          .map((m) => ({
            projectId: project.id,
            title: project.title,
            category: project.category,
            role: m.role,
            roleId: m.roleId,
            score: m.score,
            reason: m.reason,
          }))
      )
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  if (profileAnalytics) {
    const pool = normalizeStringArray([
      ...normalizeStringArray(profile?.skills),
      ...normalizeStringArray(profile?.expertise),
    ]);

    // Strengths: skills that actually matched in this freelancer's real matches.
    const strengthCount = new Map<string, number>();
    for (const item of eligible) {
      for (const skill of item.matchingSkills ?? []) {
        strengthCount.set(skill, (strengthCount.get(skill) ?? 0) + 1);
      }
    }

    // Skill gap: required/preferred skills of roles the freelancer already
    // (partly) matches that are missing from their profile.
    const gapCount = new Map<string, number>();
    for (const { project, matches } of perProject) {
      const budgetRoles = readRoles(project.budget_breakdown);
      for (const match of matches) {
        if (!match.isEligibleForRole && match.score < 40) continue;
        const roleData = budgetRoles.find((role) => role.roleId === match.roleId);
        const wanted = normalizeStringArray([...roleSkills(roleData), ...normalizeStringArray(roleData?.preferredSkills)]);
        for (const skill of wanted) {
          if (matchSkills([skill], pool).matchingSkills.length === 0) {
            gapCount.set(skill, (gapCount.get(skill) ?? 0) + 1);
          }
        }
      }
    }

    const top = (map: Map<string, number>) =>
      [...map.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([skill, count]) => ({ skill, count }));

    workspace.profile.strengths = top(strengthCount);
    workspace.profile.skillGap = top(gapCount);
    workspace.profile.suggestions = buildProfileSuggestions(profile, portfolio ?? [], workspace.profile.strengths);
  }

  if (advancedInsights) {
    const allRoles = perProject.flatMap(({ matches }) => matches);
    const eligibleRoles = allRoles.filter((m) => m.isEligibleForRole);
    workspace.profile.visibility = {
      eligibleRoles: eligibleRoles.length,
      totalOpenRoles: allRoles.length,
      averageScore:
        eligibleRoles.length > 0
          ? Math.round(eligibleRoles.reduce((sum, m) => sum + m.score, 0) / eligibleRoles.length)
          : null,
    };
  }

  workspace.summary.insights =
    (workspace.profile.suggestions?.length ?? 0) +
    (workspace.profile.skillGap?.length ? 1 : 0) +
    (workspace.profile.visibility ? 1 : 0);

  return workspace;
}

/**
 * Suggestions are rules over the freelancer's real profile — the AI never
 * edits the profile; each suggestion links to the profile form where the
 * user decides whether to apply it.
 */
function buildProfileSuggestions(
  profile: {
    title?: string | null;
    bio?: string | null;
    skills?: unknown;
    expertise?: unknown;
    availability_status?: string | null;
  } | null,
  portfolio: { description?: string | null }[],
  strengths: { skill: string; count: number }[]
): ProfileSuggestion[] {
  const suggestions: ProfileSuggestion[] = [];
  const title = (profile?.title ?? "").trim();
  const skills = normalizeStringArray(profile?.skills);
  const expertise = normalizeStringArray(profile?.expertise);

  if (title.length < 15) {
    suggestions.push({ id: "title", text: "Başlığını uzmanlığını daha net anlatacak şekilde güncelle." });
  }

  const topStrength = strengths[0]?.skill;
  if (topStrength && !title.toLocaleLowerCase("tr-TR").includes(topStrength.toLocaleLowerCase("tr-TR"))) {
    suggestions.push({
      id: "strength",
      text: `${topStrength} eşleşmelerinde en sık öne çıkan becerin; başlığında veya hakkımda bölümünde daha görünür hale getirebilirsin.`,
    });
  }

  if ((profile?.bio ?? "").trim().length < 150) {
    suggestions.push({ id: "bio", text: "Hakkımda bölümünü çalışma alanların ve yaklaşımınla detaylandır." });
  }

  if (skills.length < 5 && expertise.length > 0) {
    suggestions.push({ id: "skills", text: "Kullandığın araç ve yazılımları beceri olarak ekle; eşleşmeler bu listeyi de kullanır." });
  }

  if (portfolio.length === 0) {
    suggestions.push({ id: "portfolio", text: "Portföyüne en az bir çalışma ekle." });
  } else if (portfolio.some((item) => (item.description ?? "").trim().length < 60)) {
    suggestions.push({ id: "portfolio_desc", text: "Portföy açıklamalarını detaylandır: kapsamı ve kullandığın araçları yaz." });
  }

  if (!profile?.availability_status) {
    suggestions.push({ id: "availability", text: "Müsaitlik durumunu belirt; client'lar eşleşmelerde bunu görür." });
  }

  return suggestions.slice(0, 5);
}
