import type { SupabaseClient } from "@supabase/supabase-js";

import { generateJson, cleanJsonOutput } from "@/lib/ai/gemini";
import { matchFreelancerToProjectRoles } from "@/lib/ai/match-talent";
import { containsContactInfo } from "@/lib/moderation/contactInfoFilter";
import { normalizeStringArray } from "@/lib/utils/normalizeStringArray";

/**
 * AI Proposal Assistant — drafts a cover letter for ONE project role from
 * real data only:
 *   project description / requirements, the selected role's responsibilities
 *   and required skills, and the freelancer's own profile (title, skills,
 *   expertise, experience, project types, portfolio titles).
 *
 * The model is given these as the complete list of allowed facts and must not
 * invent skills, experience, past projects, clients or certificates. If the AI
 * is unavailable (quota) or its output fails validation, a plain draft is
 * built from the same facts, so the assistant never fabricates either way.
 * The draft is only a suggestion: the freelancer edits it and submits it
 * through the normal proposal form.
 */

export type ProposalDraftFacts = {
  projectTitle: string;
  role: string;
  matchingSkills: string[];
  profileTitle: string | null;
  experience: string | null;
  expertise: string[];
  portfolioTitles: string[];
};

export type ProposalDraft = {
  draft: string;
  source: "ai" | "profile_template";
  facts: ProposalDraftFacts;
};

export class ProposalDraftError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
  }
}

type BudgetRole = {
  roleId?: string;
  role?: string;
  responsibilities?: unknown;
  requiredSkills?: unknown;
  skills?: unknown;
};

export async function draftProposal(
  supabase: SupabaseClient,
  input: { projectId: string; roleId: string; freelancerId: string }
): Promise<ProposalDraft> {
  const matches = await matchFreelancerToProjectRoles(supabase, input.projectId, input.freelancerId);
  const match = matches.find((item) => item.roleId === input.roleId);

  if (!match) {
    throw new ProposalDraftError("Seçilen rol bu projede bulunamadı.", 404);
  }

  if (!match.isEligibleForRole) {
    throw new ProposalDraftError("Bu rol profilinle yeterince uyumlu değil.", 403);
  }

  const [{ data: project }, { data: profile }, { data: portfolio }] = await Promise.all([
    supabase
      .from("projects")
      .select("title, description, requirements, deliverables, budget_breakdown")
      .eq("id", input.projectId)
      .single(),
    supabase
      .from("profiles")
      .select("title, bio, skills, expertise, experience, project_types")
      .eq("id", input.freelancerId)
      .single(),
    supabase
      .from("portfolio_items")
      .select("title")
      .eq("freelancer_id", input.freelancerId)
      .limit(5),
  ]);

  if (!project || !profile) {
    throw new ProposalDraftError("Proje veya profil bilgisi alınamadı.", 404);
  }

  const roleData = (Array.isArray(project.budget_breakdown) ? (project.budget_breakdown as BudgetRole[]) : []).find(
    (role) => role.roleId === input.roleId
  );

  const facts: ProposalDraftFacts = {
    projectTitle: project.title,
    role: match.role,
    matchingSkills: match.matchingSkills ?? [],
    profileTitle: profile.title ?? null,
    experience: profile.experience ?? null,
    expertise: normalizeStringArray(profile.expertise).slice(0, 8),
    portfolioTitles: (portfolio ?? [])
      .map((item) => (typeof item.title === "string" ? item.title.trim() : ""))
      .filter(Boolean),
  };

  const context = {
    project: {
      title: project.title,
      description: project.description ?? "",
      requirements: normalizeStringArray(project.requirements),
      deliverables: normalizeStringArray(project.deliverables),
    },
    role: {
      name: match.role,
      responsibilities: normalizeStringArray(roleData?.responsibilities),
      requiredSkills: normalizeStringArray(roleData?.requiredSkills ?? roleData?.skills),
    },
    freelancer: {
      title: profile.title ?? null,
      bio: profile.bio ?? null,
      skills: normalizeStringArray(profile.skills),
      expertise: facts.expertise,
      experience: profile.experience ?? null,
      projectTypes: normalizeStringArray(profile.project_types),
      portfolioTitles: facts.portfolioTitles,
      skillsMatchingThisRole: facts.matchingSkills,
    },
  };

  try {
    const output = await generateJson(buildPrompt(context), { temperature: 0.3 });
    const parsed = JSON.parse(cleanJsonOutput(output)) as { draft?: unknown };
    const draft = typeof parsed.draft === "string" ? parsed.draft.trim() : "";

    if (draft.length >= 80 && draft.length <= 2000 && !containsContactInfo(draft)) {
      return { draft, source: "ai", facts };
    }
  } catch (error) {
    console.warn("[AI proposal draft] falling back to profile template:", error);
  }

  return { draft: buildTemplateDraft(facts, context.role.responsibilities), source: "profile_template", facts };
}

function buildPrompt(context: unknown) {
  return `Sen CollaCrew platformunda bir freelancer'ın teklif (cover letter) taslağını hazırlayan asistansın.

KURALLAR (kesin):
- YALNIZCA aşağıdaki JSON'da verilen bilgileri kullan. Bunlar freelancer hakkında bilinen TÜM gerçeklerdir.
- JSON'da olmayan hiçbir beceri, araç, deneyim süresi, geçmiş proje, müşteri, şirket, sertifika, ödül veya rakam UYDURMA.
- "freelancer.experience" alanı boşsa deneyim süresinden hiç bahsetme.
- Portföy başlıkları dışında geçmiş iş/proje ismi verme.
- İletişim bilgisi, e-posta, telefon, sosyal medya veya platform dışı iletişim önerme.
- Fiyat veya teslim tarihi taahhüdü yazma (freelancer bunları formda ayrıca giriyor).
- Türkçe, birinci tekil şahıs, samimi ama profesyonel; 110-170 kelime; 2-3 kısa paragraf.
- Rolün sorumluluklarına nasıl yaklaşacağını, freelancer'ın gerçekten sahip olduğu becerilerle ilişkilendir.

VERİ:
${JSON.stringify(context, null, 2)}

Sadece şu JSON'u döndür:
{"draft": "teklif metni"}`;
}

function buildTemplateDraft(facts: ProposalDraftFacts, responsibilities: string[]) {
  const intro = facts.profileTitle
    ? `Merhaba, ${facts.profileTitle} olarak "${facts.projectTitle}" projesindeki ${facts.role} rolü için teklif veriyorum.`
    : `Merhaba, "${facts.projectTitle}" projesindeki ${facts.role} rolü için teklif veriyorum.`;

  const skills = facts.matchingSkills.length > 0 ? facts.matchingSkills : facts.expertise;
  const skillLine =
    skills.length > 0 ? `Bu rolde ${skills.slice(0, 5).join(", ")} alanlarındaki birikimimi kullanacağım.` : "";

  const experienceLine = facts.experience ? `Bu alanda ${facts.experience} deneyimim var.` : "";

  const responsibilityLine =
    responsibilities.length > 0
      ? `Rolün sorumluluklarından özellikle ${responsibilities.slice(0, 2).map((item) => item.toLocaleLowerCase("tr-TR")).join(" ve ")} konularına odaklanarak ilerlemeyi planlıyorum.`
      : "";

  const portfolioLine =
    facts.portfolioTitles.length > 0
      ? `Portföyümdeki "${facts.portfolioTitles.slice(0, 2).join('", "')}" çalışmalarını inceleyebilirsiniz.`
      : "";

  return [
    intro,
    [skillLine, experienceLine].filter(Boolean).join(" "),
    [responsibilityLine, portfolioLine].filter(Boolean).join(" "),
    "Kapsamı ve beklentilerinizi netleştirmek için sorularınızı yanıtlamaktan memnuniyet duyarım.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
