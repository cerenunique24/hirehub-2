import type { SupabaseClient } from "@supabase/supabase-js";

import type { ProjectAnalysis } from "@/types/ai";

import { matchSkills } from "@/lib/matching";
import { normalizeStringArray } from "@/lib/utils/normalizeStringArray";
import { computeRoleEligibility } from "@/lib/matching/roleEligibility";
import { getServerSigningSecret } from "@/lib/server/trust";
import { publicDisplayName } from "@/lib/utils/displayName";
import {
  reviewMatchPairs,
  type SemanticPair,
  type SemanticVerdict,
} from "@/lib/ai/semanticMatch";
import {
  getCachedSemanticVerdicts,
  setCachedSemanticVerdicts,
} from "@/lib/ai/semanticMatchCache";
import { normalizeCategory } from "@/lib/categories";
import { normalizeMatchText } from "@/lib/utils/normalizeMatchText";

/**
 * Deterministic skor bu aralıktaysa ("ne net eşleşme ne net uyumsuzluk")
 * semantic (Gemini) ikinci görüş devreye girer. Aralık dışındaki adaylar
 * (çok düşük = gerçekten ilgisiz, çok yüksek = zaten güvenilir eşleşme)
 * maliyeti azaltmak için AI'a hiç gönderilmez — bkz. lib/ai/semanticMatch.ts.
 */
const SEMANTIC_REVIEW_MIN_SCORE = 15;
const SEMANTIC_REVIEW_MAX_SCORE = 65;

/**
 * Candidate pool (getFreelancerProfiles ile çekilen TÜM freelancerlar)
 * ile client'a döndürülen "final" liste ayrı kavramlardır. Binlerce
 * freelancer olsa bile response'a rol başına en fazla bu kadar aday
 * (zaten skora göre sıralanmış, sadece isEligibleForRole===true olanlar
 * arasından) gönderilir — bkz. matchTalent() sonundaki filtre adımı.
 */
const MAX_RETURNED_CANDIDATES_PER_ROLE = 20;

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

type Profile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  title: string | null;
  bio: string | null;
  skills: string[] | null;
  availability: string | null;
  availability_status: string | null;
  experience: string | number | null;
  expertise: string | null;
  project_types: string[] | null;
  role: string | null;
};

type PortfolioItem = {
  id: string;
  title: string | null;
  category: string | null;
  description: string | null;
  skills: string[] | null;
};

/**
 * Yeni sistemde project_roles tablosu kullanılmıyor.
 *
 * Roller:
 * projects.budget_breakdown
 *
 * JSONB alanında tutuluyor.
 */
type BudgetBreakdownItem = {
  roleId?: string;
  role?: string;
  name?: string;
  memberCount?: number;
  budgetPerPerson?: number;
  budget?: number;
  duration?: string;
  responsibilities?: string[];
  skills?: string[];
  requiredSkills?: string[];
  preferredSkills?: string[];
  reason?: string;
};

type ProjectRecord = {
  id: string;
  title: string;
  description: string | null;
  skills: string[] | null;
  category: string | null;
  deliverables: string[] | null;
  budget_breakdown: BudgetBreakdownItem[] | null;
};

export type TalentMatch = {
  id: string;
  name: string;
  title?: string;
  avatar?: string;
  role: string;
  score: number;
  skills: string[];
  availability:
    | "available"
    | "partially_available"
    | "busy";
  reason: string;
  memberCount?: number;
  budgetPerPerson?: number;
  budget?: number;
  /**
   * Hover info card için — sadece Supabase'te GERÇEKTEN var olan
   * profil alanları. Uydurma/örnek sayı (tamamlanan proje, puan vb.)
   * YOK çünkü şemada böyle bir alan yok; eksikse card o satırı hiç
   * göstermemeli (bkz. app/client/create-project/page.tsx FreelancerHoverCard).
   */
  bio?: string;
  /** profiles.experience — serbest metin deneyim aralığı (ör. "3-5 yıl"). */
  experience?: string;

  /**
   * Freelancer → project matching ile AYNI deterministic helper
   * (lib/matching/roleEligibility.ts) kullanılarak hesaplanır.
   *
   * Client proje oluştururken bir role için önerilen freelancer
   * listesi de bu role gerçekten uygun olmayan (role family
   * uyumsuz) profilleri "en iyi eşleşme" olarak öne çıkarmamalı —
   * Discover / proje detay sayfalarındaki KURAL burada da geçerli.
   */
  isEligibleForRole: boolean;
};

export type RoleMatchInput = {
  name: string;
  memberCount?: number;
  budgetPerPerson?: number;
  budget?: number;
  responsibilities?: string[];
  skills: string[];
  preferredSkills?: string[];
  reason?: string;
};

export type RoleMatching = {
  role: string;
  freelancers: TalentMatch[];
  /**
   * Bu rol için isEligibleForRole===true olan (candidate pool DEĞİL,
   * gerçek eşiği geçen) toplam aday sayısı. `freelancers` bu sayının
   * ilk MAX_RETURNED_CANDIDATES_PER_ROLE kadarını içerir — client
   * "X uygun freelancer" derken candidate pool boyutunu değil bu
   * sayıyı kullanmalı.
   */
  totalEligibleCount: number;
  memberCount?: number;
  budgetPerPerson?: number;
  budget?: number;
};

export type FreelancerRoleMatch = {
  roleId: string;
  role: string;
  score: number;
  reason: string;
  memberCount?: number;

  /**
   * matchScore (0-100) ile isEligibleForRole (true/false) ayrı
   * kavramlardır. Yüksek skor tek başına proposal gönderme izni
   * vermez — role family uyumsuzsa ya da skor eşiğin altındaysa
   * isEligibleForRole false döner.
   */
  isEligibleForRole: boolean;

  /**
   * Bütçe ve süre yalnızca isEligibleForRole === true olan rol için
   * döndürülür.
   *
   * 0 / undefined ise client tarafından bu rol için görünür bir
   * bütçe tanımlanmamış kabul edilir.
   */
  budgetPerPerson?: number;
  budget?: number;
  duration?: string;

  /**
   * Eşleşmeyi destekleyen somut kriterler (beceri/portfolyo örtüşümü).
   * Yalnızca isEligibleForRole === true iken doldurulur — Premium
   * "Bu proje neden eşleşiyor?" panelinde checklist olarak gösterilir.
   */
  matchingSkills?: string[];
};

type MatchCalculation = {
  score: number;
  reason: string;
  matchingSkills: string[];
};

/* -------------------------------------------------------------------------- */
/* Client / AI Matching                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Client tarafında proje rollerine freelancer eşleştirir.
 *
 * Bu fonksiyon proje oluşturulurken kullanılır.
 *
 * Önemli:
 * - Tüm freelancer profilleri değerlendirilir.
 * - Müsait olmayan freelancerlar silinmez.
 * - Availability sadece bilgi olarak döner.
 * - Bütçe matching skorunu etkilemez.
 * - Her rol kendi freelancer listesini alır.
 */
export async function matchTalent(
  supabase: SupabaseClient,
  analysis: ProjectAnalysis,
  roles?: RoleMatchInput[]
): Promise<RoleMatching[]> {
  const rolesToMatch = buildRolesToMatch(
    analysis,
    roles
  );

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[MATCH DEBUG] category:",
      analysis?.category,
      "rolesCount:",
      rolesToMatch.length,
      "roles:",
      rolesToMatch.map((role) => role.name)
    );
  }

  if (rolesToMatch.length === 0) {
    return [];
  }

  let profiles: Profile[];

  try {
    profiles = await getFreelancerProfiles(supabase);
  } catch (profilesError) {
    console.error(
      "[CollaCrew AI] matchTalent: freelancer profilleri getirilemedi:",
      profilesError instanceof Error
        ? `${profilesError.name}: ${profilesError.message}`
        : profilesError
    );

    throw profilesError;
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[MATCH DEBUG] candidates:",
      profiles.length
    );
  }

  type PendingSemanticReview = {
    pairId: string;
    target: TalentMatch;
    roleInput: RoleMatchInput;
    profile: Profile;
    calculation: MatchCalculation;
  };

  const pendingReviews: PendingSemanticReview[] = [];

  const roleMatchings = rolesToMatch.map((role) => {
    const freelancers: TalentMatch[] = [];

    const memberCount =
      normalizePositiveInteger(
        role.memberCount,
        1
      );

    const budgetPerPerson =
      normalizeMoney(
        role.budgetPerPerson
      );

    const budget =
      normalizeMoney(
        role.budget ??
          memberCount * budgetPerPerson
      );

    for (const profile of profiles) {
      /**
       * HATA İZOLASYONU
       * ----------------------------------------------------
       * Tek bir freelancer profilindeki eksik/bozuk bir alan (ör.
       * beklenmeyen bir tip) bu adayın skorlanmasını başarısız
       * kılabilir — ama bu, aynı rol için diğer TÜM adayları ya da
       * diğer rolleri (ve dolayısıyla tüm endpoint'i) 500'e
       * düşürmemeli. Hatayı logla, bu adayı atla, devam et.
       */
      const freelancerSkills =
        buildFreelancerSkillPool(profile);

      let result: MatchCalculation;

      try {
        result = calculateMatch({
          profile,
          requiredRole: role.name,
          requiredSkills: uniqueStrings(
            role.skills
          ),
          preferredSkills: uniqueStrings(
            role.preferredSkills ?? []
          ),
          responsibilities: uniqueStrings(
            role.responsibilities ?? []
          ),
          freelancerSkills,
        });
      } catch (matchError) {
        console.error(
          `[CollaCrew AI] matchTalent: aday skorlanamadı ` +
            `(profileId=${profile.id}, role=${JSON.stringify(role.name)}):`,
          matchError instanceof Error
            ? matchError.message
            : matchError
        );

        continue;
      }

      if (result.score <= 0) {
        continue;
      }

      const availability =
        normalizeAvailability(
          profile.availability,
          profile.availability_status
        );

      const eligibility =
        computeRoleEligibility(
          result.score,
          role.name,
          buildFreelancerFamilyText(profile)
        );

      const talentMatch: TalentMatch = {
        id: profile.id,
        name: getProfileName(profile),
        title:
          profile.title ||
          profile.expertise ||
          undefined,
        avatar:
          profile.avatar_url ||
          undefined,
        role: role.name,
        score: result.score,
        skills: freelancerSkills,
        availability,
        reason: result.reason,
        memberCount,
        budgetPerPerson,
        budget,
        isEligibleForRole:
          eligibility.isEligibleForRole,
        bio: profile.bio || undefined,
        experience:
          typeof profile.experience === "string" &&
          profile.experience.trim()
            ? profile.experience.trim()
            : undefined,
      };

      freelancers.push(talentMatch);

      /**
       * SEMANTIC REVIEW ADAYI MI?
       * ----------------------------------------------------
       * Deterministic skor kararsız bölgede ve rol ailesi uyumluysa,
       * bu aday matchTalent() çağrısının SONUNDA tek bir batch Gemini
       * isteğiyle (tüm roller/adaylar birlikte) ikinci kez
       * değerlendirilmek üzere işaretlenir. Aday/rol başına ayrı
       * çağrı YOK — bkz. lib/ai/semanticMatch.ts. `target` bir nesne
       * referansı olduğu için, aşağıdaki sort/dedup sonrasında da
       * geçerliliğini korur.
       */
      if (
        result.score >= SEMANTIC_REVIEW_MIN_SCORE &&
        result.score < SEMANTIC_REVIEW_MAX_SCORE &&
        eligibility.familyCompatible
      ) {
        pendingReviews.push({
          pairId: String(pendingReviews.length),
          target: talentMatch,
          roleInput: role,
          profile,
          calculation: result,
        });
      }
    }

    /**
     * Eligible freelancerlar her zaman ineligible olanların önünde
     * sıralanır — client "en iyi eşleşme" olarak role family uyumsuz
     * bir profil görmemeli, skor ne olursa olsun.
     */
    freelancers.sort((a, b) => {
      if (
        a.isEligibleForRole !==
        b.isEligibleForRole
      ) {
        return a.isEligibleForRole
          ? -1
          : 1;
      }

      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return (
        availabilitySortValue(
          a.availability
        ) -
        availabilitySortValue(
          b.availability
        )
      );
    });

    return {
      role: role.name,
      freelancers:
        deduplicateMatches(
          freelancers
        ),
      // Semantic review sonrası aşağıda yeniden hesaplanır.
      totalEligibleCount: 0,
      memberCount,
      budgetPerPerson,
      budget,
    };
  });

  /**
   * TEK BATCH SEMANTIC REVIEW
   * ----------------------------------------------------
   * Tüm rollerdeki tüm kararsız-bölge adayları toplanıp TEK bir Gemini
   * isteğiyle değerlendirilir (aday/rol sayısı ne olursa olsun bu
   * matchTalent() çağrısı başına en fazla 1 ek istek). reviewMatchPairs
   * içeride ayrıca MAX_PAIRS_PER_CALL ile sert bir üst sınır uygular —
   * en olası adayları kaybetmemek için önce deterministic skora göre
   * sıralanır.
   */
  if (pendingReviews.length > 0) {
    const sortedReviews = [...pendingReviews].sort(
      (a, b) => b.calculation.score - a.calculation.score
    );

    const projectContext = {
      title:
        analysis.category?.trim() ||
        analysis.summary?.slice(0, 60) ||
        "Proje",
      description: analysis.summary || analysis.insights || null,
      deliverables: analysis.deliverables ?? [],
    };

    const pairs: SemanticPair[] = sortedReviews.map((review) => ({
      pairId: review.pairId,
      role: {
        name: review.roleInput.name,
        responsibilities: uniqueStrings(
          review.roleInput.responsibilities ?? []
        ),
        requiredSkills: uniqueStrings(review.roleInput.skills ?? []),
        preferredSkills: uniqueStrings(
          review.roleInput.preferredSkills ?? []
        ),
      },
      freelancer: {
        title: review.profile.title,
        bio: review.profile.bio,
        skills: buildFreelancerSkillPool(review.profile),
        expertise: review.profile.expertise,
        experience: review.profile.experience,
        // Bu toplu (potansiyel olarak onlarca aday) yolda her profil
        // için ayrıca portfolyo sorgusu atmıyoruz — maliyet/performans
        // tercihi. Tek-freelancer yolunda (matchFreelancerToProjectRoles)
        // portfolyo zaten dahil.
        portfolio: [],
      },
      deterministicScore: review.calculation.score,
    }));

    /**
     * reviewMatchPairs kendi içinde zaten try/catch ile `null` döner —
     * ama semantic katman deterministic sonucu ASLA kıramaz, bu yüzden
     * burada da ekstra bir güvenlik ağı var: beklenmeyen bir hata
     * (ör. tip hatası) olsa bile deterministic sonuçlar aynen döner.
     */
    let verdicts: Awaited<ReturnType<typeof reviewMatchPairs>> = null;

    try {
      verdicts = await reviewMatchPairs(
        projectContext,
        pairs
      );
    } catch (semanticError) {
      console.error(
        "[CollaCrew AI] matchTalent: semantic review beklenmeyen şekilde " +
          "başarısız oldu, deterministic sonuçlara devam ediliyor:",
        semanticError instanceof Error
          ? semanticError.message
          : semanticError
      );
    }

    if (verdicts) {
      for (const review of sortedReviews) {
        const verdict = verdicts.get(review.pairId);

        if (!verdict) continue;

        review.target.score = verdict.score;
        review.target.reason = verdict.reason;
        review.target.isEligibleForRole = verdict.isMatch;
      }

      for (const roleMatching of roleMatchings) {
        roleMatching.freelancers.sort((a, b) => {
          if (a.isEligibleForRole !== b.isEligibleForRole) {
            return a.isEligibleForRole ? -1 : 1;
          }

          if (b.score !== a.score) {
            return b.score - a.score;
          }

          return (
            availabilitySortValue(a.availability) -
            availabilitySortValue(b.availability)
          );
        });
      }
    }
  }

  /**
   * FINAL THRESHOLD
   * ----------------------------------------------------
   * Candidate pool'da olmak (score > 0) önerilecek kişi olmak
   * anlamına gelmez. Role uygun olmayan (family uyumsuz veya skor
   * ELIGIBILITY_MATCH_THRESHOLD altında) adaylar burada elenir —
   * "X uygun freelancer" client'a gösterilen sayı ve liste artık bu
   * elemeden SONRAKİ haldir, ham candidate pool boyutu değil.
   */
  for (const roleMatching of roleMatchings) {
    const eligible = roleMatching.freelancers.filter(
      (freelancer) => freelancer.isEligibleForRole
    );

    roleMatching.totalEligibleCount = eligible.length;
    roleMatching.freelancers = eligible.slice(
      0,
      MAX_RETURNED_CANDIDATES_PER_ROLE
    );
  }

  if (process.env.NODE_ENV === "development") {
    console.log(
      "[MATCH DEBUG] finalMatches per role:",
      roleMatchings.map((role) => ({
        role: role.role,
        totalEligibleCount: role.totalEligibleCount,
        returned: role.freelancers.length,
      }))
    );
  }

  return roleMatchings;
}

/* -------------------------------------------------------------------------- */
/* Freelancer → Project Matching                                              */
/* -------------------------------------------------------------------------- */

/**
 * Freelancer proje detay / Discover sayfası için matching.
 *
 * Roller projects.budget_breakdown içerisinden okunur.
 *
 * MATCHING KURALI
 *
 * Genel proje skill'inin uyuşması tek başına freelancerı
 * role uygun kabul etmez.
 *
 * Freelancerın gerçekten role bağlı olduğunu gösteren
 * en az bir güçlü role-specific sinyal gerekir:
 *
 * 1. Profil title / expertise / bio → rol
 * 2. Role-specific skill → freelancer skill
 * 3. Portfolio → rol
 *
 * Responsibilities tek başına yeterli değildir.
 *
 * Ayrıca %55'in altında kalan sonuçlar Discover'da
 * gerçek eşleşme olarak kabul edilmez.
 *
 * ÖNEMLİ:
 * Response yalnızca eşleşen rolleri içerir.
 *
 * Böylece eşleşmeyen rollerin bütçeleri response'a
 * dahil edilmez.
 */
export async function matchFreelancerToProjectRoles(
  supabase: SupabaseClient,
  projectId: string,
  freelancerId: string
): Promise<FreelancerRoleMatch[]> {
  const [
    { data: projectData, error: projectError },
    { data: profileData, error: profileError },
    { data: portfolioData, error: portfolioError },
  ] = await Promise.all([
    supabase
      .from("projects")
      .select(
        `
          id,
          title,
          description,
          skills,
          category,
          deliverables
        `
      )
      .eq("id", projectId)
      .maybeSingle(),

    supabase
      .from("profiles")
      .select(
        [
          "id",
          "first_name",
          "avatar_url",
          "title",
          "bio",
          "skills",
          "availability",
          "availability_status",
          "experience",
          "expertise",
          "project_types",
          "role",
        ].join(", ")
      )
      .eq("id", freelancerId)
      .eq("role", "freelancer")
      .maybeSingle(),

    supabase
      .from("portfolio_items")
      .select(
        `
          id,
          title,
          category,
          description,
          skills
        `
      )
      .eq(
        "freelancer_id",
        freelancerId
      )
      .order("created_at", {
        ascending: false,
      }),
  ]);

  /* ---------------------------------------------------------------------- */
  /* Errors                                                                 */
  /* ---------------------------------------------------------------------- */

  if (projectError) {
    throw projectError;
  }

  if (profileError) {
    throw profileError;
  }

  if (portfolioError) {
    throw portfolioError;
  }

  if (!projectData) {
    return [];
  }

  if (!profileData) {
    return [];
  }

  /*
   * budget_breakdown artık doğrudan sütun olarak okunamaz (bkz.
   * supabase/migrations/202609300006_budget_breakdown_privacy.sql) —
   * PostgREST'e çıplak select ile herhangi bir authenticated kullanıcı
   * diğer rollerin bütçesini okuyabiliyordu. Sunucu tarafı eşleştirme
   * (burası — her zaman bir Next.js route handler'ı içinde çalışır) bu
   * RPC'yi sunucuya özel imzayla çağırarak TAM veriyi okur; eşleştirme/
   * eligibility mantığı aşağıda hiç değişmeden sürüyor.
   */
  const { data: budgetBreakdown, error: budgetError } = await supabase.rpc(
    "get_project_budget_breakdown",
    { p_project_id: projectId, p_server_secret: getServerSigningSecret() }
  );

  if (budgetError) {
    throw budgetError;
  }

  /* ---------------------------------------------------------------------- */
  /* Normalize                                                              */
  /* ---------------------------------------------------------------------- */

  const project =
    normalizeProject({
      ...(projectData as unknown as Record<string, unknown>),
      budget_breakdown: budgetBreakdown,
    });

  const profile =
    normalizeProfile(
      profileData as unknown as Record<
        string,
        unknown
      >
    );

  const portfolioItems = (
    (portfolioData ?? []) as unknown[]
  ).map((item) =>
    normalizePortfolioItem(
      item as Record<
        string,
        unknown
      >
    )
  );

  const projectSkills =
    normalizeSkills(
      project.skills
    );

  /* ---------------------------------------------------------------------- */
  /* Roles                                                                  */
  /* ---------------------------------------------------------------------- */

  const roles =
    normalizeBudgetBreakdown(
      project.budget_breakdown
    );

  /* ---------------------------------------------------------------------- */
  /* No roles                                                               */
  /* ---------------------------------------------------------------------- */

  if (roles.length === 0) {
    const fallbackRole: BudgetBreakdownItem = {
      roleId: "fallback-single-role",
      role: "Tek Freelancer",
      memberCount: 1,
      skills: projectSkills,
      requiredSkills: projectSkills,
    };

    roles.push(fallbackRole);
  }

  /* ---------------------------------------------------------------------- */
  /* Match                                                                  */
  /* ---------------------------------------------------------------------- */

  const results: FreelancerRoleMatch[] = [];

  type PendingSemanticReview = {
    resultIndex: number;
    roleName: string;
    projectRole: BudgetBreakdownItem;
    calculation: MatchCalculation;
    budgetInfo: ReturnType<typeof getBudgetInfo>;
  };

  const pendingReviews: PendingSemanticReview[] = [];

  for (
    let index = 0;
    index < roles.length;
    index++
  ) {
    const projectRole =
      roles[index];

    const roleName =
      getRoleName(
        projectRole,
        index
      );

    const budgetInfo =
      getBudgetInfo(
        projectRole
      );

    const projectRoleRecord = {
      id:
        projectRole.roleId ??
        `budget-role-${index}`,

      role_name:
        roleName,

      required_count:
        projectRole.memberCount ??
        1,
    };

    /**
     * HATA İZOLASYONU
     * ----------------------------------------------------
     * Tek bir rolün skorlanması (ör. beklenmeyen bir veri şekli
     * yüzünden) başarısız olursa bu SADECE o rolü response'tan
     * düşürür — diğer roller ve tüm endpoint etkilenmez.
     */
    let calculation: MatchCalculation;

    try {
      calculation =
        calculateFreelancerProjectRoleMatch({
          project,
          projectRole:
            projectRoleRecord,
          profile,
          portfolioItems,
          projectSkills,
          roleData: projectRole,
        });
    } catch (matchError) {
      console.error(
        `[CollaCrew AI] matchFreelancerToProjectRoles: rol skorlanamadı ` +
          `(roleId=${projectRoleRecord.id}, role=${JSON.stringify(roleName)}):`,
        matchError instanceof Error ? matchError.message : matchError
      );

      continue;
    }

    /**
     * ROLE ELIGIBILITY
     * ----------------------------------------------------
     * matchScore (calculation.score) ile isEligibleForRole ayrı
     * kavramlardır. Bir rol asla listeden düşürülmez (freelancer
     * kendi profiliyle hangi rollere ne kadar uyduğunu görebilmeli),
     * ancak yalnızca isEligibleForRole === true olan roller için
     * proposal gönderilebilir ve bütçe/süre bilgisi döndürülür.
     *
     * Eligibility iki sinyale bakar:
     * 1) matchScore >= ELIGIBILITY_MATCH_THRESHOLD
     * 2) role family uyumu (ör. Architect / Interior Architect,
     *    Brand Designer / Digital Marketing / Full Stack Developer
     *    ile otomatik eşleşmez — bkz. lib/matching/roleEligibility.ts)
     */
    const eligibility = computeRoleEligibility(
      calculation.score,
      roleName,
      buildFreelancerFamilyText(profile)
    );

    results.push({
      roleId:
        projectRole.roleId ??
        `budget-role-${index}`,

      role: roleName,

      score:
        calculation.score,

      reason:
        calculation.reason,

      isEligibleForRole:
        eligibility.isEligibleForRole,

      memberCount:
        budgetInfo.memberCount ??
        normalizePositiveInteger(
          projectRole.memberCount,
          1
        ),

      /**
       * Bütçe ve süre sadece isEligibleForRole === true olan rol için
       * döndürülür. Eğer client bütçe girmemişse normalizeMoney() zaten
       * 0 döndürür — o durumda budgetPerPerson/budget hiç eklenmez.
       */
      ...(eligibility.isEligibleForRole
        ? {
            budgetPerPerson:
              budgetInfo.budgetPerPerson || undefined,
            budget:
              budgetInfo.budget || undefined,
            duration:
              typeof projectRole.duration === "string" &&
              projectRole.duration.trim()
                ? projectRole.duration.trim()
                : undefined,
            matchingSkills:
              calculation.matchingSkills.length > 0
                ? calculation.matchingSkills
                : undefined,
          }
        : {}),
    });

    /**
     * SEMANTIC REVIEW ADAYI MI?
     * ----------------------------------------------------
     * Kelime-örtüşmeli deterministic skor "kararsız bölgede" ve rol
     * ailesi zaten uyumluysa (tamamen alakasız bir alan değilse) bu rolü
     * AI ile ikinci kez değerlendirmek üzere işaretle. Aşağıda TEK bir
     * batch çağrıyla (bu freelancer'ın tüm kararsız rolleri birlikte)
     * gönderilecek — rol/aday başına ayrı Gemini isteği YOK.
     */
    if (
      calculation.score >= SEMANTIC_REVIEW_MIN_SCORE &&
      calculation.score < SEMANTIC_REVIEW_MAX_SCORE &&
      eligibility.familyCompatible
    ) {
      pendingReviews.push({
        resultIndex: results.length - 1,
        roleName,
        projectRole,
        calculation,
        budgetInfo,
      });
    }
  }

  if (pendingReviews.length > 0) {
    // freelancer + proje çifti için 24 saatlik cache: taze bir verdict
    // varsa Gemini'ye HİÇ gidilmez. pairId burada review.roleName
    // (resultIndex değil) çünkü cache tekrar kullanılabilir olmalı —
    // resultIndex her çağrıda değişebilir, rol adı aynı projede kalıcı.
    const cachedVerdicts = await getCachedSemanticVerdicts(
      supabase,
      freelancerId,
      projectId
    );

    const allRolesCached =
      cachedVerdicts !== null &&
      pendingReviews.every((review) => cachedVerdicts.has(review.roleName));

    let verdicts: Map<string, SemanticVerdict> | null = allRolesCached
      ? cachedVerdicts
      : null;

    if (!verdicts) {
      const pairs: SemanticPair[] = pendingReviews.map((review) => ({
        pairId: review.roleName,
        role: {
          name: review.roleName,
          responsibilities: uniqueStrings(
            review.projectRole.responsibilities ?? []
          ),
          requiredSkills: uniqueStrings([
            ...(review.projectRole.skills ?? []),
            ...(review.projectRole.requiredSkills ?? []),
          ]),
          preferredSkills: uniqueStrings(
            review.projectRole.preferredSkills ?? []
          ),
        },
        freelancer: {
          title: profile.title,
          bio: profile.bio,
          skills: buildFreelancerSkillPool(profile),
          expertise: profile.expertise,
          experience: profile.experience,
          portfolio: portfolioItems
            .map((item) =>
              [item.title, item.category]
                .filter((value): value is string => Boolean(value))
                .join(" — ")
            )
            .filter((text) => text.length > 0),
        },
        deterministicScore: review.calculation.score,
      }));

      try {
        verdicts = await reviewMatchPairs(
          {
            title: project.title,
            description: project.description,
            deliverables: project.deliverables ?? [],
          },
          pairs
        );

        if (verdicts) {
          await setCachedSemanticVerdicts(
            supabase,
            freelancerId,
            projectId,
            verdicts
          );
        }
      } catch (semanticError) {
        console.error(
          "[CollaCrew AI] matchFreelancerToProjectRoles: semantic review " +
            "beklenmeyen şekilde başarısız oldu, deterministic sonuçlara " +
            "devam ediliyor:",
          semanticError instanceof Error
            ? semanticError.message
            : semanticError
        );
      }
    }

    if (verdicts) {
      for (const review of pendingReviews) {
        const verdict = verdicts.get(review.roleName);

        if (!verdict) continue;

        const target = results[review.resultIndex];

        target.score = verdict.score;
        target.reason = verdict.reason;
        target.isEligibleForRole = verdict.isMatch;

        if (verdict.isMatch) {
          target.budgetPerPerson =
            review.budgetInfo.budgetPerPerson || undefined;
          target.budget = review.budgetInfo.budget || undefined;
          target.duration =
            typeof review.projectRole.duration === "string" &&
            review.projectRole.duration.trim()
              ? review.projectRole.duration.trim()
              : undefined;
          target.matchingSkills =
            review.calculation.matchingSkills.length > 0
              ? review.calculation.matchingSkills
              : undefined;
        } else {
          target.budgetPerPerson = undefined;
          target.budget = undefined;
          target.duration = undefined;
          target.matchingSkills = undefined;
        }
      }
    }
  }

  return results.sort(
    (a, b) =>
      b.score - a.score
  );
}

/* -------------------------------------------------------------------------- */
/* Freelancer skill pool                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Skill overlap uses everything the freelancer declared on their profile:
 * the `skills` tool list (e.g. "AutoCAD") AND the `expertise` areas
 * (e.g. "Interior Design, Space Planning"). Before, expertise was ignored,
 * so a role requiring "Interior Design" scored low against an interior
 * architect whose expertise listed exactly that.
 */
function buildFreelancerSkillPool(profile: Profile): string[] {
  return uniqueStrings([
    ...normalizeSkills(profile.skills),
    ...normalizeStringArray(profile.expertise),
  ]);
}

/**
 * Project category ↔ the freelancer's declared project types.
 *
 * Her iki taraf da normalizeCategory() (lib/categories.ts) ile canonical
 * karşılığına çözülür — eski, tam yazımla eşleşmeyen kayıtlar (ör.
 * "Yazılım" ya da "Yazılım & Teknoloji") artık canonical "Yazılım
 * Geliştirme" ile eşleşir. Hiçbir DB satırı değiştirilmez, sadece
 * karşılaştırma normalize edilir.
 */
function hasProjectTypeMatch(profile: Profile, category: string | null): boolean {
  if (!category || !profile.project_types?.length) return false;

  const target = normalizeText(normalizeCategory(category) ?? category);

  return profile.project_types.some(
    (type) => normalizeText(normalizeCategory(type) ?? type) === target
  );
}

/* -------------------------------------------------------------------------- */
/* Freelancer Project Role Calculation                                        */
/* -------------------------------------------------------------------------- */

function calculateFreelancerProjectRoleMatch({
  project,
  projectRole,
  profile,
  portfolioItems,
  projectSkills,
  roleData,
}: {
  project: ProjectRecord;
  projectRole: {
    id: string;
    role_name: string;
    required_count: number;
  };
  profile: Profile;
  portfolioItems: PortfolioItem[];
  projectSkills: string[];
  roleData: BudgetBreakdownItem;
}): MatchCalculation {
  const roleName =
    projectRole.role_name;

  /**
   * team_required !== true olan (tek freelancer) projelerde
   * gerçek bir rol adı yok; "Tek Freelancer" fallback'ine karşı
   * role-text / portfolio-role-text karşılaştırması yapmak
   * anlamsız ve skoru gereksiz yere düşürür. Bu durumda genel
   * proje skill'leri doğrudan ana sinyal olarak kullanılır.
   */
  const isGeneralProjectRole =
    roleData.roleId === "fallback-single-role";

  const freelancerSkills =
    buildFreelancerSkillPool(profile);

  const projectTypeMatch =
    hasProjectTypeMatch(profile, project.category);

  /* ---------------------------------------------------------------------- */
  /* Role-specific skills                                                    */
  /* ---------------------------------------------------------------------- */

  const roleSkills =
    uniqueStrings([
      ...normalizeSkills(
        roleData.skills ?? null
      ),

      ...normalizeSkills(
        roleData.requiredSkills ?? null
      ),
    ]);

  const rolePreferredSkills =
    uniqueStrings(
      roleData.preferredSkills ??
        []
    );

  const roleResponsibilities =
    uniqueStrings(
      roleData.responsibilities ??
        []
    );

  /* ---------------------------------------------------------------------- */
  /* Profile texts                                                           */
  /* ---------------------------------------------------------------------- */

  const roleTexts = [
    profile.title,
    profile.expertise,
    profile.bio,
    ...(profile.project_types ?? []),
  ].filter(
    (
      value
    ): value is string =>
      typeof value === "string" &&
      value.trim().length > 0
  );

  /* ---------------------------------------------------------------------- */
  /* Role score                                                              */
  /* ---------------------------------------------------------------------- */

  const roleScore =
    calculateRoleTextScore(
      roleName,
      roleTexts
    );

  /* ---------------------------------------------------------------------- */
  /* Role skills                                                             */
  /* ---------------------------------------------------------------------- */

  const roleSkillMatch =
    roleSkills.length > 0
      ? matchSkills(
          roleSkills,
          freelancerSkills
        )
      : {
          percentage: 0,
          matchingSkills: [],
        };

  const preferredSkillMatch =
    rolePreferredSkills.length > 0
      ? matchSkills(
          rolePreferredSkills,
          freelancerSkills
        )
      : {
          percentage: 0,
          matchingSkills: [],
        };

  /* ---------------------------------------------------------------------- */
  /* Project skills                                                          */
  /* ---------------------------------------------------------------------- */

  const projectSkillMatch =
    projectSkills.length > 0
      ? matchSkills(
          projectSkills,
          freelancerSkills
        )
      : {
          percentage: 0,
          matchingSkills: [],
        };

  /**
   * team_required !== true projelerde tek "rol", projenin TÜM
   * skill listesi olabiliyor (10+ öğe). Sadece recall (matched /
   * required) kullanmak, becerilerinin büyük kısmı bu projeyle
   * doğrudan alakalı olan bir freelancer'ı bile eşiğin altında
   * bırakabiliyor. Bu yüzden recall ile precision'ın (matched /
   * freelancerSkills) daha iyisini alıyoruz — yalnızca genel
   * proje rolü için.
   */
  const generalSkillPercentage =
    isGeneralProjectRole && freelancerSkills.length > 0
      ? Math.max(
          roleSkillMatch.percentage,
          Math.round(
            (roleSkillMatch.matchingSkills.length /
              freelancerSkills.length) *
              100
          )
        )
      : roleSkillMatch.percentage;

  /* ---------------------------------------------------------------------- */
  /* Portfolio skills                                                        */
  /* ---------------------------------------------------------------------- */

  const portfolioSkills =
    uniqueStrings(
      portfolioItems.flatMap(
        (item) =>
          item.skills ?? []
      )
    );

  const portfolioSkillMatch =
    projectSkills.length > 0 &&
    portfolioSkills.length > 0
      ? matchSkills(
          projectSkills,
          portfolioSkills
        )
      : {
          percentage: 0,
          matchingSkills: [],
        };

  /* ---------------------------------------------------------------------- */
  /* Portfolio role score                                                    */
  /* ---------------------------------------------------------------------- */

  const portfolioRoleScore =
    calculateRoleTextScore(
      roleName,
      portfolioItems.flatMap(
        (item) =>
          [
            item.title,
            item.category,
            item.description,
          ].filter(
            (
              value
            ): value is string =>
              typeof value ===
                "string" &&
              value.trim()
                .length > 0
          )
      )
    );

  /* ---------------------------------------------------------------------- */
  /* Experience                                                              */
  /* ---------------------------------------------------------------------- */

  const experienceScore =
    calculateExperienceScore(
      profile.experience
    );

  /* ---------------------------------------------------------------------- */
  /* Responsibilities                                                       */
  /* ---------------------------------------------------------------------- */

  const responsibilityScore =
    calculateResponsibilityScore(
      roleResponsibilities,
      profile,
      freelancerSkills
    );

  /* ---------------------------------------------------------------------- */
  /* Skill weighting                                                         */
  /* ---------------------------------------------------------------------- */

  let weightedSkillScore = 0;

  if (isGeneralProjectRole) {
    /**
     * Tek freelancer / team_required !== true projelerde tek
     * sinyal proje skill'leridir (recall+precision karışımı).
     */
    weightedSkillScore = generalSkillPercentage;
  } else if (roleSkills.length > 0) {
    /**
     * Role-specific skill açık ara en önemli
     * skill sinyalidir.
     */
    weightedSkillScore =
      roleSkillMatch.percentage *
        0.75 +
      preferredSkillMatch.percentage *
        0.10 +
      projectSkillMatch.percentage *
        0.15;
  } else if (
    projectSkills.length > 0
  ) {
    /**
     * Rol-specific skill yoksa proje skill'leri
     * kullanılabilir fakat ağırlığı sınırlıdır.
     */
    weightedSkillScore =
      projectSkillMatch.percentage *
        0.75 +
      preferredSkillMatch.percentage *
        0.25;
  }

  /* ---------------------------------------------------------------------- */
  /* Final score                                                             */
  /* ---------------------------------------------------------------------- */

  /**
   * Genel proje rolünde (tek freelancer) rol adı "Tek Freelancer"
   * olduğu için roleScore / portfolioRoleScore (rol METNİ karşılaştırması)
   * anlamsızdır ve skoru gereksiz yere seyreltir. Bu durumda ağırlık
   * neredeyse tamamen skill uyumuna ve deneyime verilir.
   */
  let score = isGeneralProjectRole
    ? weightedSkillScore * 0.9 +
      experienceScore * 0.1
    : weightedSkillScore * 0.35 +
      roleScore * 0.30 +
      responsibilityScore * 0.15 +
      portfolioRoleScore * 0.15 +
      experienceScore * 0.05;

  // Declared project-type compatibility only ever adds a little, and never
  // on its own (a role signal must already exist).
  if (projectTypeMatch && score > 0) {
    score += 5;
  }

  /**
   * Çok güçlü profil + role-specific skill.
   */
  if (
    roleScore >= 80 &&
    roleSkillMatch.percentage >= 70
  ) {
    score = Math.max(
      score,
      90
    );
  }

  /**
   * Güçlü profil + portfolyo uyumu.
   */
  if (
    roleScore >= 70 &&
    portfolioRoleScore >= 70
  ) {
    score = Math.max(
      score,
      80
    );
  }

  /**
   * Role-specific skill çok güçlüyse profil başlığının
   * birebir aynı olması şart değil.
   */
  if (
    roleSkillMatch.percentage >= 80
  ) {
    score = Math.max(
      score,
      75
    );
  }

  /**
   * Hiçbir temel role sinyali yoksa kesinlikle eşleşme yok.
   *
   * ÖNEMLİ: burada roleSkillMatch (SADECE role-specific requiredSkills/
   * skills alanına bakar) değil, weightedSkillScore kontrol edilir.
   * roleData.requiredSkills/skills boşsa (client bir role için beceri
   * girmeden projeyi yayınlayabiliyor — bkz. app/client/create-project)
   * roleSkillMatch.percentage HER ZAMAN 0'dır, ama weightedSkillScore bu
   * durumda zaten projectSkillMatch'e (projenin genel beceri listesi)
   * düşer (bkz. yukarıdaki "else if (projectSkills.length > 0)" dalı).
   * Eskiden roleSkillMatch.percentage kontrol edildiği için, sırf o rol
   * için beceri tanımlanmamış diye — freelancer'ın genel proje
   * becerileriyle güçlü örtüşmesi olsa bile — skor sıfırlanıyordu. Bu,
   * "veri alanı eksikliği gerçekten uyan bir freelancer'ı %0 yapmamalı"
   * kuralını ihlal ediyordu. calculateMatch() (aşağıda) zaten aynı sinyali
   * doğru şekilde weightedSkillScore üzerinden kontrol ediyor — burası
   * ona tutarlı hale getirildi.
   */
  if (
    roleScore === 0 &&
    weightedSkillScore === 0 &&
    portfolioRoleScore === 0 &&
    responsibilityScore === 0
  ) {
    score = 0;
  }

  const finalScore =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(score)
      )
    );

  /**
   * For a named role, only the role's own skills are reported as "matching"
   * — project-wide skills still feed the score, but listing them under e.g.
   * "Frontend Developer" would be a misleading reason.
   */
  const matchingSkills =
    isGeneralProjectRole || roleSkills.length === 0
      ? uniqueStrings([
          ...roleSkillMatch.matchingSkills,
          ...preferredSkillMatch.matchingSkills,
          ...projectSkillMatch.matchingSkills,
          ...portfolioSkillMatch.matchingSkills,
        ])
      : uniqueStrings([
          ...roleSkillMatch.matchingSkills,
          ...preferredSkillMatch.matchingSkills,
        ]);

  const availability =
    normalizeAvailability(
      profile.availability,
      profile.availability_status
    );

  const reason =
    buildFreelancerProjectReason({
      roleName,
      roleScore,
      responsibilityScore,
      portfolioRoleScore,
      experienceScore,
      matchingSkills,
      finalScore,
      availability,
      projectTypeMatch,
    });

  return {
    score: finalScore,
    reason,
    matchingSkills,
  };
}

/* -------------------------------------------------------------------------- */
/* Role matching                                                              */
/* -------------------------------------------------------------------------- */

function calculateRoleTextScore(
  requiredRole: string,
  candidateTexts: string[]
): number {
  const required =
    normalizeText(
      requiredRole
    );

  if (!required) {
    return 0;
  }

  const aliases =
    getRoleAliases(required);

  const roleCandidates = [
    required,
    ...aliases,
  ];

  let bestScore = 0;

  for (
    const candidateRole of roleCandidates
  ) {
    const requiredWords =
      getMeaningfulWords(
        candidateRole
      );

    if (
      requiredWords.length === 0
    ) {
      continue;
    }

    for (
      const candidateText of candidateTexts
    ) {
      const normalizedCandidate =
        normalizeText(
          candidateText
        );

      if (!normalizedCandidate) {
        continue;
      }

      /**
       * Birebir rol ifadesi varsa en güçlü eşleşme.
       */
      if (
        normalizedCandidate.includes(
          candidateRole
        )
      ) {
        bestScore = Math.max(
          bestScore,
          100
        );

        continue;
      }

      const candidateWords =
        getMeaningfulWords(
          normalizedCandidate
        );

      const matchingWords =
        requiredWords.filter(
          (word) =>
            candidateWords.includes(
              word
            )
        );

      if (
        matchingWords.length === 0
      ) {
        continue;
      }

      const percentage =
        (matchingWords.length /
          requiredWords.length) *
        100;

      bestScore = Math.max(
        bestScore,
        percentage
      );
    }
  }

  /**
   * İkinci geçiş: eş anlamlı olmayan ama gerçekten ilişkili roller
   * (bkz. getRelatedRoles). Sadece birebir/substring eşleşmesi
   * kontrol edilir (word-overlap uygulanmaz) ve katkı
   * RELATED_ROLE_SCORE ile sınırlıdır — bu yüzden "Yazar" rolü
   * isteyen bir proje, unvanı "Senarist" olan bir freelancer'ı artık
   * roleScore=0 yüzünden otomatik elemez, ama bu tek başına da
   * "birebir eşleşme" gücünde sayılmaz.
   */
  if (bestScore < RELATED_ROLE_SCORE) {
    for (
      const relatedRole of getRelatedRoles(
        required
      )
    ) {
      for (
        const candidateText of candidateTexts
      ) {
        const normalizedCandidate =
          normalizeText(
            candidateText
          );

        if (
          normalizedCandidate &&
          normalizedCandidate.includes(
            relatedRole
          )
        ) {
          bestScore = Math.max(
            bestScore,
            RELATED_ROLE_SCORE
          );
        }
      }
    }
  }

  if (
    bestScore >
      RELATED_ROLE_SCORE &&
    isQualifierDowngrade(
      required,
      candidateTexts
    )
  ) {
    bestScore =
      RELATED_ROLE_SCORE;
  }

  return Math.round(
    Math.min(
      100,
      bestScore
    )
  );
}

/**
 * Bazı compound/qualifier rol adları ("İç Mimar" = "İç" + "Mimar",
 * "Product Photographer" = "Product" + "Photographer") temel
 * substring/word-overlap kontrolünde KAÇINILMAZ OLARAK ana rolün
 * kendisini içerir — bu yüzden hiçbir alias/related listesi
 * eklenmese bile normalde 100 (exact) puan alırlardı. Ama bunlar
 * GERÇEKTE farklı bir uzmanlık (bkz. matching audit: "Mimar ↔ İç
 * Mimar exact değil, closely related olmalı").
 *
 * Bu, substring/word-overlap MEKANİZMASINI değiştirmez — sadece bu
 * bilinen, açıkça listelenmiş çiftlerin SONUCUNU RELATED_ROLE_SCORE'a
 * sınırlar (calculateRoleTextScore'un sonunda uygulanır).
 */
const QUALIFIER_DOWNGRADE_PAIRS: [
  string,
  string
][] = [
  ["mimar", "ic mimar"],
  ["architect", "interior architect"],
  ["photographer", "product photographer"],
  ["photographer", "fashion photographer"],
  ["photographer", "event photographer"],
  ["fotografci", "urun fotografcisi"],
  ["fotografci", "moda fotografcisi"],
  ["fotografci", "etkinlik fotografcisi"],
];

function isQualifierDowngrade(
  required: string,
  candidateTexts: string[]
): boolean {
  return candidateTexts.some(
    (text) => {
      const candidate =
        normalizeText(text);

      return QUALIFIER_DOWNGRADE_PAIRS.some(
        ([a, b]) =>
          (required === a &&
            candidate.includes(
              b
            )) ||
          (required === b &&
            candidate.includes(
              a
            ))
      );
    }
  );
}

/**
 * EXACT / SYNONYM roller.
 *
 * Bu liste SADECE gerçekten "aynı işin farklı adı" olan çiftler
 * içindir — aynı meslek, farklı dil (TR/EN) ya da yaygın yazım
 * varyasyonu (bkz. matching audit — role relationship matrisi).
 *
 * "Product Designer", "UI Designer", "UX Designer" gibi GERÇEKTE
 * FARKLI uzmanlıklar (birbiriyle örtüşse de aynı iş değil) burada
 * DEĞİL — getRelatedRoles()'ta, sınırlı puanla. Bu ayrım kasıtlı:
 * "Mimar ↔ İç Mimar", "Photographer ↔ Product Photographer" gibi
 * çiftlerin exact/100 puan almasını önlemek için.
 */
function getRoleAliases(
  role: string
): string[] {
  const normalized =
    normalizeText(role);

  const aliasGroups: Record<
    string,
    string[]
  > = {
    /* ---- UI/UX & Web Tasarım — sadece aynı işin TR/EN adı ---- */
    "ui ux tasarim": ["ui ux designer"],
    "ui ux designer": ["ui ux tasarim"],
    "ui designer": ["arayuz tasarimcisi", "arayuz tasarimi"],
    "arayuz tasarimcisi": ["ui designer"],
    "ux designer": ["kullanici deneyimi tasarimcisi"],
    "kullanici deneyimi tasarimcisi": ["ux designer"],
    "product designer": ["urun tasarimcisi"],
    "urun tasarimcisi": ["product designer"],
    "web tasarim": ["web designer", "web design"],
    "web designer": ["web tasarim", "web design"],
    "web design": ["web tasarim", "web designer"],

    /* ---- Frontend / Backend geliştirme (değiştirilmedi) ---- */
    "frontend gelistirme": [
      "frontend developer",
      "front end developer",
      "web developer",
      "frontend engineer",
    ],

    "frontend developer": [
      "frontend gelistirme",
      "front end developer",
      "web developer",
      "frontend engineer",
    ],

    "backend gelistirme": [
      "backend developer",
      "back end developer",
      "backend engineer",
    ],

    "backend developer": [
      "backend gelistirme",
      "back end developer",
      "backend engineer",
    ],

    /* ---- Grafik / Marka — sadece aynı işin TR/EN adı ---- */
    "grafik tasarim": ["graphic designer", "grafik tasarimci"],
    "graphic designer": ["grafik tasarim", "grafik tasarimci"],
    "grafik tasarimci": ["graphic designer", "grafik tasarim"],
    "marka tasarimi": ["brand designer", "marka tasarimcisi"],
    "brand designer": ["marka tasarimi", "marka tasarimcisi"],
    "marka tasarimcisi": ["brand designer", "marka tasarimi"],
    "logo tasarimi": ["logo designer"],
    "logo designer": ["logo tasarimi"],

    "mobil uygulama": [
      "mobile developer",
      "mobile app developer",
      "ios developer",
      "android developer",
      "react native developer",
      "flutter developer",
    ],

    "mobile developer": [
      "mobil uygulama",
      "mobile app developer",
      "ios developer",
      "android developer",
      "react native developer",
      "flutter developer",
    ],

    "yazilim gelistirme": [
      "software developer",
      "software engineer",
      "developer",
    ],

    "software developer": [
      "yazilim gelistirme",
      "software engineer",
      "developer",
    ],

    /*
     * Dijital Pazarlama — "seo specialist"/"social media specialist"
     * ARTIK bu listede değil: SEO ya da sosyal medya uzmanlığı,
     * genel dijital pazarlamacılıkla aynı iş değil, ilişkili ama ayrı
     * bir uzmanlık (bkz. getRelatedRoles).
     */
    "dijital pazarlama": [
      "digital marketing",
      "digital marketing specialist",
      "digital marketer",
      "marketing specialist",
      "dijital pazarlama uzmani",
    ],

    "dijital pazarlama uzmani": [
      "digital marketing",
      "digital marketing specialist",
      "digital marketer",
      "marketing specialist",
      "dijital pazarlama",
    ],

    "digital marketing": [
      "dijital pazarlama",
      "dijital pazarlama uzmani",
      "digital marketing specialist",
      "digital marketer",
      "marketing specialist",
    ],

    "seo": [
      "seo specialist",
      "seo uzmani",
      "search engine optimization",
    ],

    "social media": [
      "social media specialist",
      "social media manager",
      "sosyal medya uzmani",
      "sosyal medya yoneticisi",
    ],

    "sosyal medya": [
      "social media specialist",
      "social media manager",
      "social media",
    ],

    "icerik uretimi": [
      "content creator",
      "content writer",
      "copywriter",
      "content specialist",
      "content",
    ],

    "content creator": [
      "icerik uretimi",
      "content writer",
      "copywriter",
      "content specialist",
    ],

    "content": [
      "content creator",
      "content writer",
      "copywriter",
      "content specialist",
      "icerik uretimi",
    ],

    "ui ux": [
      "ui ux designer",
      "ui ux tasarim",
    ],

    "frontend": [
      "frontend developer",
      "frontend gelistirme",
      "front end developer",
      "web developer",
    ],

    "backend": [
      "backend developer",
      "backend gelistirme",
      "back end developer",
    ],

    /* ---- Yazarlık / İçerik — sadece aynı işin TR/EN adı ---- */
    senarist: ["senaryo yazari", "screenwriter"],
    "senaryo yazari": ["senarist", "screenwriter"],
    screenwriter: ["senarist", "senaryo yazari"],

    /* ---- Çeviri — writing'den AYRI, kendi exact grubu ---- */
    translator: ["cevirmen", "tercuman"],
    cevirmen: ["translator", "tercuman"],
    tercuman: ["translator", "cevirmen"],

    /* ---- 3D Tasarım ---- */
    "3d artist": ["3d sanatci"],
    "3d sanatci": ["3d artist"],
    "3d modeler": ["3d modelleyici"],
    "3d modelleyici": ["3d modeler"],

    /* ---- Mimari & İç Mekân — sadece aynı işin TR/EN adı ---- */
    mimar: ["architect"],
    architect: ["mimar"],
    "ic mimar": ["interior architect"],
    "interior architect": ["ic mimar"],
    "peyzaj mimari": ["landscape architect"],
    "landscape architect": ["peyzaj mimari"],

    /* ---- Video & Animasyon ---- */
    "video editor": ["video editoru"],
    "video editoru": ["video editor"],
    "video producer": ["video yapimcisi"],
    "video yapimcisi": ["video producer"],

    /* ---- Fotoğraf ---- */
    photographer: ["fotografci"],
    fotografci: ["photographer"],

    /* ---- Ses & Müzik ---- */
    "sound designer": ["ses tasarimcisi"],
    "ses tasarimcisi": ["sound designer"],
    "music producer": ["muzik produktoru"],
    "muzik produktoru": ["music producer"],

    /* ---- İş & Yönetim ---- */
    "project manager": ["proje yoneticisi"],
    "proje yoneticisi": ["project manager"],
  };

  return (
    aliasGroups[normalized] ??
    []
  );
}

/**
 * "Yakın ama eş anlamlı DEĞİL" roller.
 *
 * getRoleAliases() içindeki gruplar (ör. UI/UX Designer ↔ Product
 * Designer) gerçek eş anlamlılardır — birebir alias eşleşmesi 100 puan
 * alır. Ama "Yazar" ile "Senarist" ya da "İçerik Yazarı" öyle değil:
 * gerçekten ilişkili meslekler ama birbirinin otomatik yerine geçmemeli
 * (bkz. matching audit — "Kitap yazma projesi + Senarist" senaryosu).
 *
 * Bu liste calculateRoleTextScore()'da SADECE RELATED_ROLE_SCORE ile
 * sınırlı (aliaslardaki 100 potansiyeline göre daha düşük) bir katkı
 * sağlar — nihai skoru tek başına belirlemez, diğer sinyallerle
 * (skill/responsibility/experience) birlikte eşik karşılaştırmasına
 * girer.
 */
function getRelatedRoles(
  role: string
): string[] {
  const normalized =
    normalizeText(role);

  const relatedGroups: Record<
    string,
    string[]
  > = {
    /* ---- UI/UX — birbiriyle örtüşen ama AYNI iş olmayan uzmanlıklar ---- */
    "ui ux tasarim": [
      "ui designer",
      "ux designer",
      "product designer",
      "interaction designer",
      "ux researcher",
      "web designer",
      "design system designer",
      "urun tasarimcisi",
    ],
    "ui ux designer": [
      "ui designer",
      "ux designer",
      "product designer",
      "interaction designer",
      "ux researcher",
      "web designer",
      "design system designer",
      "urun tasarimcisi",
    ],
    "product designer": [
      "ui designer",
      "ux designer",
      "interaction designer",
      "ux researcher",
      "ui ux designer",
      "ui ux tasarim",
    ],
    "urun tasarimcisi": [
      "ui designer",
      "ux designer",
      "interaction designer",
      "ux researcher",
      "ui ux designer",
      "ui ux tasarim",
    ],
    "ui designer": [
      "ux designer",
      "product designer",
      "ui ux designer",
      "ui ux tasarim",
      "interaction designer",
    ],
    "ux designer": [
      "ui designer",
      "product designer",
      "ux researcher",
      "ui ux designer",
      "ui ux tasarim",
      "interaction designer",
    ],
    "ux researcher": [
      "ux designer",
      "product designer",
      "ui ux designer",
      "ui ux tasarim",
    ],
    "kullanici arastirmacisi": [
      "ux designer",
      "product designer",
      "ui ux designer",
    ],
    "interaction designer": [
      "ui designer",
      "ux designer",
      "product designer",
      "ui ux designer",
    ],
    "etkilesim tasarimcisi": [
      "ui designer",
      "ux designer",
      "product designer",
    ],
    "design system designer": [
      "ui designer",
      "product designer",
      "ui ux designer",
    ],
    "web tasarim": [
      "ui designer",
      "product designer",
      "ui ux designer",
      "ux designer",
    ],
    "web design": [
      "ui designer",
      "product designer",
      "ui ux designer",
      "ux designer",
    ],
    "web designer": [
      "ui designer",
      "product designer",
      "ui ux designer",
      "ux designer",
    ],

    /* ---- Grafik / Marka — birbiriyle örtüşen ama AYNI iş olmayan uzmanlıklar ---- */
    "grafik tasarim": [
      "visual designer",
      "brand designer",
      "illustrator",
      "art director",
      "creative designer",
      "logo designer",
    ],
    "grafik tasarimci": [
      "visual designer",
      "brand designer",
      "illustrator",
      "art director",
      "creative designer",
      "logo designer",
    ],
    "graphic designer": [
      "visual designer",
      "brand designer",
      "illustrator",
      "art director",
      "creative designer",
      "logo designer",
    ],
    "marka tasarimi": [
      "graphic designer",
      "visual designer",
      "art director",
      "creative designer",
      "grafik tasarim",
    ],
    "marka tasarimcisi": [
      "graphic designer",
      "visual designer",
      "art director",
      "creative designer",
      "grafik tasarim",
    ],
    "brand designer": [
      "graphic designer",
      "visual designer",
      "art director",
      "creative designer",
      "grafik tasarim",
    ],
    "visual designer": [
      "graphic designer",
      "brand designer",
      "illustrator",
      "grafik tasarim",
    ],
    "gorsel tasarimci": [
      "graphic designer",
      "brand designer",
      "illustrator",
    ],
    "art director": [
      "graphic designer",
      "brand designer",
      "creative designer",
      "illustrator",
    ],
    "sanat yonetmeni": [
      "graphic designer",
      "brand designer",
      "creative designer",
    ],
    illustrator: [
      "graphic designer",
      "visual designer",
      "creative designer",
    ],
    "creative designer": [
      "graphic designer",
      "brand designer",
      "art director",
    ],
    "yaratici tasarimci": [
      "graphic designer",
      "brand designer",
      "art director",
    ],
    "logo designer": [
      "graphic designer",
      "brand designer",
    ],

    /* ---- Yazılım geliştirme — mevcut exact gruplara ek, geniş sektör terimleri ---- */
    "frontend gelistirme": [
      "react developer",
      "typescript developer",
      "javascript developer",
      "full stack developer",
    ],
    "frontend developer": [
      "react developer",
      "typescript developer",
      "javascript developer",
      "full stack developer",
    ],
    frontend: [
      "react developer",
      "typescript developer",
      "javascript developer",
      "full stack developer",
    ],
    "yazilim gelistirme": [
      "full stack developer",
      "backend developer",
      "react developer",
    ],
    "software developer": [
      "full stack developer",
      "backend developer",
      "react developer",
    ],

    /* ---- Dijital Pazarlama — genel pazarlama ile alt-uzmanlıklar arası ---- */
    "dijital pazarlama": [
      "seo specialist",
      "social media specialist",
      "social media manager",
      "content strategist",
      "advertising specialist",
      "performance marketer",
      "growth marketer",
    ],
    "dijital pazarlama uzmani": [
      "seo specialist",
      "social media specialist",
      "social media manager",
      "content strategist",
      "advertising specialist",
    ],
    "digital marketing": [
      "seo specialist",
      "social media specialist",
      "social media manager",
      "content strategist",
      "advertising specialist",
      "performance marketer",
      "growth marketer",
    ],
    seo: ["dijital pazarlama", "digital marketing"],
    "social media": ["dijital pazarlama", "digital marketing"],
    "sosyal medya": ["dijital pazarlama", "digital marketing"],

    /*
     * ---- Yazarlık / İçerik ----
     * "senarist" ↔ "senaryo yazari" artık BURADA DEĞİL — exact/synonym
     * olarak getRoleAliases()'a taşındı (bkz. audit düzeltmesi).
     */
    yazar: [
      "senarist",
      "senaryo yazari",
      "kitap yazari",
      "icerik yazari",
      "metin yazari",
      "hikaye yazari",
      "roman yazari",
      "copywriter",
      "content writer",
    ],
    "kitap yazari": [
      "yazar",
      "senarist",
      "senaryo yazari",
      "hikaye yazari",
      "roman yazari",
    ],
    senarist: [
      "yazar",
      "kitap yazari",
      "hikaye yazari",
    ],
    "senaryo yazari": [
      "yazar",
      "hikaye yazari",
      "kitap yazari",
    ],
    "hikaye yazari": [
      "yazar",
      "senarist",
      "senaryo yazari",
      "kitap yazari",
      "icerik yazari",
    ],
    "icerik yazari": [
      "yazar",
      "metin yazari",
      "kitap yazari",
      "hikaye yazari",
      "copywriter",
      "content writer",
    ],
    "metin yazari": [
      "icerik yazari",
      "yazar",
      "copywriter",
      "content writer",
    ],

    /* ---- 3D Tasarım ---- */
    "3d artist": [
      "3d modeler",
      "character designer",
      "motion designer",
      "game designer",
    ],
    "3d sanatci": [
      "3d modeler",
      "character designer",
      "motion designer",
      "game designer",
    ],
    "3d modeler": [
      "3d artist",
      "character designer",
      "cad designer",
    ],
    "3d modelleyici": [
      "3d artist",
      "character designer",
      "cad designer",
    ],

    /* ---- Mimari & İç Mekân — farklı ama gerçekten ilişkili uzmanlıklar ---- */
    mimar: [
      "ic mimar",
      "interior architect",
      "landscape architect",
      "architectural visualizer",
      "mimari gorsellestirici",
      "cad designer",
      "technical designer",
    ],
    architect: [
      "ic mimar",
      "interior architect",
      "landscape architect",
      "architectural visualizer",
      "mimari gorsellestirici",
      "cad designer",
      "technical designer",
    ],
    "ic mimar": [
      "mimar",
      "architect",
      "architectural visualizer",
      "mimari gorsellestirici",
    ],
    "interior architect": [
      "mimar",
      "architect",
      "architectural visualizer",
      "mimari gorsellestirici",
    ],
    "architectural visualizer": [
      "mimar",
      "ic mimar",
      "architect",
      "interior architect",
    ],
    "mimari gorsellestirici": [
      "mimar",
      "ic mimar",
      "architect",
      "interior architect",
    ],
    "cad designer": [
      "mimar",
      "ic mimar",
      "technical designer",
    ],
    "cad tasarimcisi": [
      "mimar",
      "ic mimar",
      "technical designer",
    ],

    /* ---- Video & Animasyon ---- */
    "video editor": [
      "motion designer",
      "video producer",
      "videographer",
      "post production specialist",
      "animator",
    ],
    "video editoru": [
      "motion designer",
      "video producer",
      "videographer",
      "post production specialist",
      "animator",
    ],
    "motion designer": [
      "video editor",
      "animator",
      "3d artist",
    ],
    "hareketli grafik tasarimcisi": [
      "video editor",
      "animator",
      "3d artist",
    ],
    videographer: [
      "video editor",
      "video producer",
    ],
    animator: [
      "motion designer",
      "3d artist",
      "character animator",
    ],

    /* ---- Fotoğraf — farklı ama gerçekten ilişkili uzmanlıklar ---- */
    photographer: [
      "product photographer",
      "fashion photographer",
      "event photographer",
      "photo editor",
      "retoucher",
    ],
    fotografci: [
      "product photographer",
      "fashion photographer",
      "event photographer",
      "photo editor",
      "retoucher",
    ],
    "product photographer": [
      "photographer",
      "fashion photographer",
      "event photographer",
    ],
    "urun fotografcisi": [
      "photographer",
      "fashion photographer",
      "event photographer",
    ],
    "fashion photographer": [
      "photographer",
      "product photographer",
      "event photographer",
    ],
    "event photographer": [
      "photographer",
      "product photographer",
      "fashion photographer",
    ],
    "photo editor": [
      "photographer",
      "retoucher",
    ],
    retoucher: [
      "photographer",
      "photo editor",
    ],

    /* ---- Ses & Müzik ---- */
    "ses tasarimcisi": [
      "muzik produktoru",
      "ses muhendisi",
      "podcast produktoru",
    ],
    "sound designer": [
      "music producer",
      "sound engineer",
      "podcast producer",
    ],
    "muzik produktoru": [
      "ses tasarimcisi",
      "ses muhendisi",
      "dublaj sanatcisi",
    ],
    "music producer": [
      "sound designer",
      "sound engineer",
      "voice actor",
    ],

    /* ---- İş & Yönetim ---- */
    "proje yoneticisi": [
      "business analyst",
      "business consultant",
      "operations manager",
      "virtual assistant",
    ],
    "project manager": [
      "business analyst",
      "business consultant",
      "operations manager",
      "virtual assistant",
    ],
  };

  return (
    relatedGroups[normalized] ??
    []
  );
}

/**
 * related (eş anlamlı olmayan ama ilişkili) rol eşleşmesinin alabileceği
 * en yüksek puan — tam alias/birebir eşleşmenin (100) altında, gerçek
 * ilişkisizliğin (0) üstünde.
 */
const RELATED_ROLE_SCORE = 65;

/* -------------------------------------------------------------------------- */
/* Client matching helpers                                                    */
/* -------------------------------------------------------------------------- */

function calculateMatch({
  profile,
  requiredRole,
  requiredSkills,
  preferredSkills,
  responsibilities,
  freelancerSkills,
}: {
  profile: Profile;
  requiredRole: string;
  requiredSkills: string[];
  preferredSkills: string[];
  responsibilities: string[];
  freelancerSkills: string[];
}): MatchCalculation {
  const skillMatch =
    requiredSkills.length > 0
      ? matchSkills(
          requiredSkills,
          freelancerSkills
        )
      : {
          percentage: 0,
          matchingSkills: [],
        };

  const preferredSkillMatch =
    preferredSkills.length > 0
      ? matchSkills(
          preferredSkills,
          freelancerSkills
        )
      : {
          percentage: 0,
          matchingSkills: [],
        };

  let weightedSkillScore = 0;

  if (
    requiredSkills.length > 0
  ) {
    weightedSkillScore =
      skillMatch.percentage *
        0.85 +
      preferredSkillMatch.percentage *
        0.15;
  } else if (
    preferredSkills.length > 0
  ) {
    weightedSkillScore =
      preferredSkillMatch.percentage;
  }

  const roleScore =
    calculateRoleScore(
      requiredRole,
      profile
    );

  const responsibilityScore =
    calculateResponsibilityScore(
      responsibilities,
      profile,
      freelancerSkills
    );

  const experienceScore =
    calculateExperienceScore(
      profile.experience
    );

  let score =
    weightedSkillScore * 0.45 +
    roleScore * 0.25 +
    responsibilityScore * 0.15 +
    experienceScore * 0.15;

  if (
    weightedSkillScore === 0 &&
    roleScore === 0 &&
    responsibilityScore === 0
  ) {
    score = 0;
  }

  if (
    roleScore >= 80 &&
    weightedSkillScore >= 80
  ) {
    score = Math.max(
      score,
      85
    );
  }

  const finalScore =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(score)
      )
    );

  const matchingSkills =
    uniqueStrings([
      ...skillMatch.matchingSkills,
      ...preferredSkillMatch.matchingSkills,
    ]);

  const availability =
    normalizeAvailability(
      profile.availability,
      profile.availability_status
    );

  const reason =
    buildMatchReason({
      requiredRole,
      matchingSkills,
      roleScore,
      responsibilityScore,
      experienceScore,
      availability,
      finalScore,
    });

  return {
    score: finalScore,
    reason,
    matchingSkills,
  };
}

function calculateRoleScore(
  requiredRole: string,
  profile: Profile
): number {
  const candidateTexts = [
    profile.title,
    profile.expertise,
    profile.bio,
  ].filter(
    (
      value
    ): value is string =>
      typeof value === "string" &&
      value.trim().length > 0
  );

  return calculateRoleTextScore(
    requiredRole,
    candidateTexts
  );
}

function calculateResponsibilityScore(
  responsibilities: string[],
  profile: Profile,
  freelancerSkills: string[]
): number {
  if (
    responsibilities.length === 0
  ) {
    return 0;
  }

  const profileText = [
    profile.title,
    profile.expertise,
    profile.bio,
    ...freelancerSkills,
  ]
    .filter(
      (
        value
      ): value is string =>
        typeof value === "string" &&
        value.trim().length > 0
    )
    .join(" ");

  if (!profileText) {
    return 0;
  }

  const normalizedProfile =
    normalizeText(
      profileText
    );

  let total = 0;

  for (
    const responsibility of responsibilities
  ) {
    const words =
      getMeaningfulWords(
        normalizeText(
          responsibility
        )
      );

    if (
      words.length === 0
    ) {
      continue;
    }

    const matchingWords =
      words.filter((word) =>
        normalizedProfile.includes(
          word
        )
      );

    if (
      matchingWords.length === 0
    ) {
      continue;
    }

    total +=
      (matchingWords.length /
        words.length) *
      100;
  }

  return Math.round(
    Math.min(
      100,
      total /
        responsibilities.length
    )
  );
}

/* -------------------------------------------------------------------------- */
/* Experience                                                                 */
/* -------------------------------------------------------------------------- */

function calculateExperienceScore(
  experience:
    | string
    | number
    | null
): number {
  if (
    experience === null ||
    experience === undefined ||
    experience === ""
  ) {
    return 50;
  }

  if (
    typeof experience === "number"
  ) {
    return scoreYears(
      experience
    );
  }

  const text =
    normalizeText(
      String(experience)
    );

  const numberMatch =
    text.match(
      /\d+(?:[.,]\d+)?/
    );

  if (numberMatch) {
    const years = Number(
      numberMatch[0].replace(
        ",",
        "."
      )
    );

    if (
      Number.isFinite(years)
    ) {
      return scoreYears(
        years
      );
    }
  }

  if (
    text.includes("senior") ||
    text.includes("uzman") ||
    text.includes("kidemli")
  ) {
    return 90;
  }

  if (
    text.includes("mid") ||
    text.includes("orta seviye")
  ) {
    return 75;
  }

  if (
    text.includes("junior") ||
    text.includes("baslangic")
  ) {
    return 55;
  }

  return 50;
}

function scoreYears(
  years: number
): number {
  if (years >= 7) return 100;
  if (years >= 5) return 90;
  if (years >= 3) return 80;
  if (years >= 2) return 70;
  if (years >= 1) return 60;

  return 40;
}

/* -------------------------------------------------------------------------- */
/* Reasons                                                                    */
/* -------------------------------------------------------------------------- */

function buildMatchReason({
  requiredRole,
  matchingSkills,
  roleScore,
  responsibilityScore,
  experienceScore,
  availability,
  finalScore,
}: {
  requiredRole: string;
  matchingSkills: string[];
  roleScore: number;
  responsibilityScore: number;
  experienceScore: number;
  availability:
    | "available"
    | "partially_available"
    | "busy";
  finalScore: number;
}): string {
  const reasons: string[] = [];

  if (roleScore >= 80) {
    reasons.push(
      `${requiredRole} rolüyle güçlü uyum`
    );
  } else if (
    roleScore >= 50
  ) {
    reasons.push(
      `${requiredRole} rolüyle uyumlu profil`
    );
  }

  if (
    matchingSkills.length > 0
  ) {
    reasons.push(
      `Eşleşen yetenekler: ${matchingSkills
        .slice(0, 5)
        .join(", ")}`
    );
  }

  if (
    responsibilityScore >= 70
  ) {
    reasons.push(
      "Proje sorumluluklarıyla uyumlu deneyim"
    );
  }

  if (
    experienceScore >= 80
  ) {
    reasons.push(
      "Deneyim seviyesi proje için uygun"
    );
  }

  if (
    availability ===
    "partially_available"
  ) {
    reasons.push(
      "Kısmen müsait"
    );
  }

  if (
    availability === "busy"
  ) {
    reasons.push(
      "Şu anda meşgul"
    );
  }

  if (
    reasons.length === 0
  ) {
    reasons.push(
      `Proje gereksinimleriyle %${finalScore} uyum`
    );
  }

  return (
    reasons.join(". ") + "."
  );
}

function buildFreelancerProjectReason({
  roleName,
  roleScore,
  responsibilityScore,
  portfolioRoleScore,
  experienceScore,
  matchingSkills,
  finalScore,
  availability,
  projectTypeMatch = false,
}: {
  projectTypeMatch?: boolean;
  roleName: string;
  roleScore: number;
  responsibilityScore: number;
  portfolioRoleScore: number;
  experienceScore: number;
  matchingSkills: string[];
  finalScore: number;
  availability:
    | "available"
    | "partially_available"
    | "busy";
}): string {
  const reasons: string[] = [];

  if (
    roleScore >= 80
  ) {
    reasons.push(
      `${roleName} rolüyle güçlü profil uyumu`
    );
  } else if (
    roleScore >= 50
  ) {
    reasons.push(
      `${roleName} rolüyle uyumlu profil`
    );
  }

  if (
    matchingSkills.length > 0
  ) {
    reasons.push(
      `Eşleşen yetenekler: ${matchingSkills
        .slice(0, 5)
        .join(", ")}`
    );
  }

  if (
    portfolioRoleScore >= 80
  ) {
    reasons.push(
      "Portfolyondaki çalışmalar bu rolle güçlü şekilde örtüşüyor"
    );
  } else if (
    portfolioRoleScore >= 50
  ) {
    reasons.push(
      "Portfolyonda bu rolle ilişkili çalışmalar bulunuyor"
    );
  }

  if (
    responsibilityScore >= 70
  ) {
    reasons.push(
      "Proje sorumluluklarıyla uyumlu deneyim"
    );
  }

  if (projectTypeMatch && finalScore >= 40) {
    reasons.push("Proje türü uyumu");
  }

  // Experience only supports an existing match — it is not a reason by itself.
  if (
    experienceScore >= 80 &&
    finalScore >= 40
  ) {
    reasons.push(
      "Deneyim seviyen proje için uygun"
    );
  }

  if (
    availability ===
    "partially_available"
  ) {
    reasons.push(
      "Kısmen müsait"
    );
  }

  if (
    availability === "busy"
  ) {
    reasons.push(
      "Şu anda meşgul"
    );
  }

  if (
    reasons.length === 0
  ) {
    reasons.push(
      `Proje gereksinimleriyle %${finalScore} uyum`
    );
  }

  return (
    reasons.join(". ") + "."
  );
}

/* -------------------------------------------------------------------------- */
/* Role building                                                              */
/* -------------------------------------------------------------------------- */

function buildRolesToMatch(
  analysis: ProjectAnalysis,
  roles?: RoleMatchInput[]
): RoleMatchInput[] {
  if (
    Array.isArray(roles) &&
    roles.length > 0
  ) {
    return roles
      .filter(
        (role) =>
          role &&
          typeof role.name ===
            "string" &&
          role.name.trim()
      )
      .map((role) => {
        const memberCount =
          normalizePositiveInteger(
            role.memberCount,
            1
          );

        const budgetPerPerson =
          normalizeMoney(
            role.budgetPerPerson
          );

        const budget =
          normalizeMoney(
            role.budget ??
              memberCount *
                budgetPerPerson
          );

        return {
          name:
            role.name.trim(),

          memberCount,

          budgetPerPerson,

          budget,

          responsibilities:
            uniqueStrings(
              role.responsibilities ??
                []
            ),

          skills:
            uniqueStrings(
              role.skills ?? []
            ),

          preferredSkills:
            uniqueStrings(
              role.preferredSkills ??
                []
            ),

          reason:
            typeof role.reason ===
            "string"
              ? role.reason
              : undefined,
        };
      });
  }

  if (
    !analysis ||
    !Array.isArray(
      analysis.roleDetails
    )
  ) {
    return [];
  }

  return analysis.roleDetails
    .filter(
      (role) =>
        role &&
        typeof role.role ===
          "string" &&
        role.role.trim()
    )
    .map((role) => ({
      name:
        role.role.trim(),

      memberCount: 1,

      budgetPerPerson: 0,

      budget: 0,

      responsibilities:
        uniqueStrings(
          role.responsibilities ??
            []
        ),

      skills:
        uniqueStrings(
          role.requiredSkills ??
            []
        ),

      preferredSkills:
        uniqueStrings(
          role.preferredSkills ??
            []
        ),

      reason:
        typeof role.reason === "string"
          ? role.reason
          : undefined,
    }));
}

/* -------------------------------------------------------------------------- */
/* Profile queries                                                            */
/* -------------------------------------------------------------------------- */

async function getFreelancerProfiles(
  supabase: SupabaseClient
): Promise<Profile[]> {
  const {
    data,
    error,
  } = await supabase
    .from("profiles")
    .select(
      [
        "id",
        "first_name",
        "avatar_url",
        "title",
        "bio",
        "skills",
        "availability",
          "availability_status",
        "experience",
        "expertise",
        "project_types",
        "role",
      ].join(", ")
    )
    .eq(
      "role",
      "freelancer"
    );

  if (error) {
    throw error;
  }

  const rows =
    (data ?? []) as unknown as Record<
      string,
      unknown
    >[];

  return rows
    .map(normalizeProfile)
    .filter(
      (profile) =>
        profile.id.length > 0
    );
}

/**
 * Role family tespiti için kullanılan freelancer metni.
 *
 * title + expertise + skills birleşimi kullanılır: title tek başına
 * yetersiz kalabilir (ör. "Freelancer"), skills ise family sinyalini
 * güçlendirir.
 */
function buildFreelancerFamilyText(profile: Profile): string {
  const skills = Array.isArray(profile.skills)
    ? profile.skills.join(" ")
    : "";

  return [profile.title, profile.expertise, skills]
    .filter(
      (value): value is string =>
        typeof value === "string" && value.trim().length > 0
    )
    .join(" ");
}

/* -------------------------------------------------------------------------- */
/* Normalizers                                                                */
/* -------------------------------------------------------------------------- */

function normalizeProfile(
  profile: Record<
    string,
    unknown
  >
): Profile {
  return {
    id: String(
      profile.id ?? ""
    ),

    first_name:
      typeof profile.first_name ===
      "string"
        ? profile.first_name
        : null,

    last_name:
      typeof profile.last_name ===
      "string"
        ? profile.last_name
        : null,

    avatar_url:
      typeof profile.avatar_url ===
      "string"
        ? profile.avatar_url
        : null,

    title:
      typeof profile.title ===
      "string"
        ? profile.title
        : null,

    bio:
      typeof profile.bio ===
      "string"
        ? profile.bio
        : null,

    skills:
      Array.isArray(
        profile.skills
      )
        ? profile.skills.filter(
            (
              skill
            ): skill is string =>
              typeof skill ===
              "string"
          )
        : null,

    availability:
      typeof profile.availability ===
      "string"
        ? profile.availability
        : null,

    availability_status:
      typeof profile.availability_status ===
      "string"
        ? profile.availability_status
        : null,

    experience:
      typeof profile.experience ===
        "string" ||
      typeof profile.experience ===
        "number"
        ? profile.experience
        : null,

    expertise:
      typeof profile.expertise ===
      "string"
        ? profile.expertise
        : null,

    project_types: Array.isArray(profile.project_types)
      ? profile.project_types.filter(
          (item): item is string => typeof item === "string" && item.trim().length > 0
        )
      : null,

    role:
      typeof profile.role ===
      "string"
        ? profile.role
        : null,
  };
}

function normalizePortfolioItem(
  item: Record<
    string,
    unknown
  >
): PortfolioItem {
  return {
    id: String(
      item.id ?? ""
    ),

    title:
      typeof item.title ===
      "string"
        ? item.title
        : null,

    category:
      typeof item.category ===
      "string"
        ? item.category
        : null,

    description:
      typeof item.description ===
      "string"
        ? item.description
        : null,

    skills:
      Array.isArray(
        item.skills
      )
        ? item.skills.filter(
            (
              skill
            ): skill is string =>
              typeof skill ===
              "string"
          )
        : null,
  };
}

function normalizeProject(
  project: Record<
    string,
    unknown
  >
): ProjectRecord {
  return {
    id: String(
      project.id ?? ""
    ),

    title: String(
      project.title ?? ""
    ),

    description:
      typeof project.description ===
      "string"
        ? project.description
        : null,

    skills:
      Array.isArray(
        project.skills
      )
        ? project.skills.filter(
            (
              skill
            ): skill is string =>
              typeof skill ===
              "string"
          )
        : null,

    category:
      typeof project.category ===
      "string"
        ? project.category
        : null,

    deliverables:
      Array.isArray(
        project.deliverables
      )
        ? project.deliverables.filter(
            (
              item
            ): item is string =>
              typeof item ===
                "string" &&
              item.trim().length > 0
          )
        : null,

    budget_breakdown:
      normalizeBudgetBreakdown(
        project.budget_breakdown
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Budget breakdown                                                           */
/* -------------------------------------------------------------------------- */

function normalizeBudgetBreakdown(
  value: unknown
): BudgetBreakdownItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (item) =>
        item &&
        typeof item ===
          "object"
    )
    .map((item) => {
      const record =
        item as Record<
          string,
          unknown
        >;

      return {
        roleId:
          typeof record.roleId ===
          "string"
            ? record.roleId
            : undefined,

        role:
          typeof record.role ===
          "string"
            ? record.role
            : undefined,

        name:
          typeof record.name ===
          "string"
            ? record.name
            : undefined,

        memberCount:
          typeof record.memberCount ===
          "number"
            ? record.memberCount
            : undefined,

        budgetPerPerson:
          typeof record.budgetPerPerson ===
          "number"
            ? record.budgetPerPerson
            : undefined,

        budget:
          typeof record.budget ===
          "number"
            ? record.budget
            : undefined,

        duration:
          typeof record.duration ===
          "string"
            ? record.duration
            : undefined,

        responsibilities:
          Array.isArray(
            record.responsibilities
          )
            ? record.responsibilities.filter(
                (
                  item
                ): item is string =>
                  typeof item ===
                  "string"
              )
            : undefined,

        skills:
          Array.isArray(
            record.skills
          )
            ? record.skills.filter(
                (
                  item
                ): item is string =>
                  typeof item ===
                  "string"
              )
            : undefined,

        requiredSkills:
          Array.isArray(
            record.requiredSkills
          )
            ? record.requiredSkills.filter(
                (
                  item
                ): item is string =>
                  typeof item ===
                  "string"
              )
            : undefined,

        preferredSkills:
          Array.isArray(
            record.preferredSkills
          )
            ? record.preferredSkills.filter(
                (
                  item
                ): item is string =>
                  typeof item ===
                  "string"
              )
            : undefined,

        reason:
          typeof record.reason ===
          "string"
            ? record.reason
            : undefined,
      };
    });
}

function getRoleName(
  role: BudgetBreakdownItem,
  index: number
): string {
  const name =
    role.role ??
    role.name;

  if (
    typeof name === "string" &&
    name.trim()
  ) {
    return name.trim();
  }

  return `Rol ${index + 1}`;
}

function getBudgetInfo(
  role: BudgetBreakdownItem
): {
  memberCount?: number;
  budgetPerPerson?: number;
  budget?: number;
} {
  return {
    memberCount:
      normalizePositiveInteger(
        role.memberCount,
        1
      ),

    budgetPerPerson:
      normalizeMoney(
        role.budgetPerPerson
      ),

    budget:
      normalizeMoney(
        role.budget
      ),
  };
}

/* -------------------------------------------------------------------------- */
/* Availability                                                               */
/* -------------------------------------------------------------------------- */

function normalizeAvailability(
  value: string | null,
  statusValue?: string | null
):
  | "available"
  | "partially_available"
  | "busy" {
  /*
   * availability_status kanonik enum kolonudur ('available' | 'limited'
   * | 'unavailable'). Doluysa serbest metin (`availability`)
   * heuristiği yerine doğrudan bu kullanılır.
   */
  if (statusValue === "limited") {
    return "partially_available";
  }

  if (statusValue === "unavailable") {
    return "busy";
  }

  if (statusValue === "available") {
    return "available";
  }

  if (!value) {
    return "available";
  }

  const normalized =
    normalizeText(value);

  if (
    normalized ===
      "available" ||
    normalized ===
      "musait" ||
    normalized ===
      "tamamen musait" ||
    normalized ===
      "available now" ||
    normalized ===
      "yeni projelere acik"
  ) {
    return "available";
  }

  if (
    normalized ===
      "partially_available" ||
    normalized ===
      "partially available" ||
    normalized ===
      "partially-available" ||
    normalized ===
      "kismen musait"
  ) {
    return "partially_available";
  }

  if (
    normalized ===
      "busy" ||
    normalized ===
      "mesgul" ||
    normalized ===
      "unavailable" ||
    normalized ===
      "unavailable now" ||
    normalized ===
      "yeni projelere kapali"
  ) {
    return "busy";
  }

  if (
    normalized.includes(
      "haftada"
    )
  ) {
    return "available";
  }

  return "available";
}

function availabilitySortValue(
  availability:
    | "available"
    | "partially_available"
    | "busy"
): number {
  if (
    availability ===
    "available"
  ) {
    return 0;
  }

  if (
    availability ===
    "partially_available"
  ) {
    return 1;
  }

  return 2;
}

/* -------------------------------------------------------------------------- */
/* Utilities                                                                  */
/* -------------------------------------------------------------------------- */

/*
 * Marketplace'te soyisim karşı tarafa gösterilmez (bkz. supabase/migrations/
 * 202609300012_surname_privacy.sql) — client'a yalnızca ilk ad döner.
 */
function getProfileName(
  profile: Profile
): string {
  return publicDisplayName(profile, "Freelancer");
}

function normalizeSkills(
  skills: string[] | null
): string[] {
  if (!Array.isArray(skills)) {
    return [];
  }

  return uniqueStrings(
    skills
  );
}

function uniqueStrings(
  values: unknown[]
): string[] {
  const result: string[] = [];

  const seen =
    new Set<string>();

  for (
    const value of values
  ) {
    if (
      typeof value !==
      "string"
    ) {
      continue;
    }

    const trimmed =
      value.trim();

    if (!trimmed) {
      continue;
    }

    const normalized =
      normalizeText(
        trimmed
      );

    if (
      seen.has(
        normalized
      )
    ) {
      continue;
    }

    seen.add(
      normalized
    );

    result.push(
      trimmed
    );
  }

  return result;
}

function normalizeText(
  value: string
): string {
  return normalizeMatchText(value);
}

function getMeaningfulWords(
  value: string
): string[] {
  const stopWords =
    new Set([
      "ve",
      "veya",
      "ile",
      "icin",
      "bir",
      "bu",
      "the",
      "a",
      "an",
      "of",
      "for",
      "and",
      // Generic activity words: "konsept geliştirme" in a bio must not
      // count as a partial match for "Frontend Geliştirme".
      "gelistirme",
      "uzmani",
      "uzman",
    ]);

  return value
    .split(
      /[\s,/|&+\\_-]+/
    )
    .map((word) =>
      word.trim()
    )
    .filter(
      (word) =>
        word.length >= 3 &&
        !stopWords.has(
          word
        )
    );
}

function normalizePositiveInteger(
  value: unknown,
  fallback: number
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return fallback;
  }

  return Math.max(
    1,
    Math.floor(value)
  );
}

function normalizeMoney(
  value: unknown
): number {
  if (
    typeof value !==
      "number" ||
    !Number.isFinite(value)
  ) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(value)
  );
}

function deduplicateMatches(
  matches: TalentMatch[]
): TalentMatch[] {
  const map = new Map<
    string,
    TalentMatch
  >();

  for (
    const match of matches
  ) {
    const key =
      `${match.id}::${normalizeText(
        match.role
      )}`;

    const existing =
      map.get(key);

    if (
      !existing ||
      match.score >
        existing.score
    ) {
      map.set(
        key,
        match
      );
    }
  }

  return Array.from(
    map.values()
  );
}
