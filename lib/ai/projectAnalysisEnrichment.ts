import type { ProjectAnalysis, ProjectBrief } from "@/types/ai";

/**
 * Plus/Pro "CollaCrew AI" zenginleştirmesi.
 *
 * ÖNEMLİ: Bu modül YENİ bir Gemini çağrısı yapmaz — free kullanıcı
 * için zaten üretilen `ProjectAnalysis` çıktısını (requiredRoles,
 * requiredSkills, roleDetails) deterministic kurallarla daha
 * detaylı görünümlere dönüştürür. Böylece:
 * - Free akışı hiç değişmez / bozulmaz (aynı Gemini çağrısı, aynı
 *   temel `analysis` alanı).
 * - Plus/Pro kullanıcı ekstra bir AI çağrısı beklemeden (kota riski
 *   olmadan) anında zenginleştirilmiş içgörü alır.
 * - Hiçbir sayı/istatistik uydurulmaz — tamamı gerçek AI çıktısının
 *   (rol/skill listeleri, brief bütçe/süre) türetilmiş halidir.
 */

export type RoleSkillGap = {
  role: string;
  missingRequiredSkills: string[];
};

export type PlusProjectAnalysis = {
  detailedRoleAnalysis: Array<{
    role: string;
    insight: string;
  }>;
  skillCoverage: {
    totalRequiredSkills: number;
    rolesWithoutRequiredSkills: string[];
  };
  skillGapInsights: string[];
  budgetDurationAssessment: {
    hasBudget: boolean;
    hasDeadline: boolean;
    insight: string;
    flags: string[];
  };
};

export type ProProjectAnalysis = {
  teamCompositionInsight: string;
  alternativeRoleSuggestions: string[];
  riskAnalysis: {
    level: "low" | "medium" | "high";
    risks: string[];
  };
  advancedBudgetInsight: string;
  advancedRecommendations: string[];
};

function parseBudgetRange(budget: string): { min: number | null; max: number | null } {
  const numbers = (budget.match(/\d[\d.,]*/g) ?? [])
    .map((n) => Number(n.replace(/\./g, "").replace(",", ".")))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (numbers.length === 0) return { min: null, max: null };
  if (numbers.length === 1) return { min: numbers[0], max: numbers[0] };
  return { min: Math.min(...numbers), max: Math.max(...numbers) };
}

export function buildPlusAnalysis(
  analysis: ProjectAnalysis,
  brief: ProjectBrief
): PlusProjectAnalysis {
  const roleDetails = analysis.roleDetails ?? [];

  const detailedRoleAnalysis = roleDetails.map((role) => {
    const requiredCount = role.requiredSkills?.length ?? 0;
    const preferredCount = role.preferredSkills?.length ?? 0;
    const responsibilityCount = role.responsibilities?.length ?? 0;

    const parts: string[] = [];

    parts.push(
      requiredCount > 0
        ? `${requiredCount} zorunlu beceri belirlendi.`
        : "Bu rol için zorunlu beceri belirtilmemiş — client'ın rol tanımını gözden geçirmesi önerilir."
    );

    if (preferredCount > 0) {
      parts.push(`${preferredCount} tercih edilen beceri var.`);
    }

    if (responsibilityCount > 0) {
      parts.push(`${responsibilityCount} somut sorumluluk tanımlandı.`);
    }

    return {
      role: role.role,
      insight: parts.join(" "),
    };
  });

  const rolesWithoutRequiredSkills = roleDetails
    .filter((role) => (role.requiredSkills?.length ?? 0) === 0)
    .map((role) => role.role);

  const skillGapInsights: string[] = [];

  if (rolesWithoutRequiredSkills.length > 0) {
    skillGapInsights.push(
      `${rolesWithoutRequiredSkills.join(", ")} rolü/rolleri için zorunlu beceri tanımlanmamış — freelancer eşleşme kalitesi bundan etkilenebilir.`
    );
  }

  const briefSkillsNotAssigned = (brief.skills ?? []).filter(
    (skill) =>
      !roleDetails.some((role) =>
        [...(role.requiredSkills ?? []), ...(role.preferredSkills ?? [])].some(
          (s) => s.toLocaleLowerCase("tr-TR") === skill.toLocaleLowerCase("tr-TR")
        )
      )
  );

  if (briefSkillsNotAssigned.length > 0) {
    skillGapInsights.push(
      `Seçtiğin ${briefSkillsNotAssigned.join(", ")} becerisi/becerileri henüz hiçbir role atanmamış görünüyor.`
    );
  }

  if (skillGapInsights.length === 0) {
    skillGapInsights.push("Belirgin bir beceri boşluğu tespit edilmedi.");
  }

  /*
   * ÖNEMLİ: Bu analiz, client bütçe/teslim süresini GİRMEDEN ÖNCE
   * (proje oluşturma akışının "İhtiyaçlar" adımında, "Bütçe & Yayın"
   * adımından önce) çalışır — brief.budget/brief.deadline bu noktada
   * yapısal olarak HER ZAMAN boştur. Bunu "eksik bilgi" uyarısı olarak
   * göstermek client'a henüz sırası gelmemiş bir adımı "unutulmuş"
   * gibi gösterirdi. Bu yüzden burada bütçe/süre YOKLUĞU hiç
   * değerlendirilmez; yalnızca (nadiren) bütçe zaten biliniyorsa
   * (ör. ileride brief'e taşınırsa) rol başına düşük bütçe uyarısı
   * anlamlı kalmaya devam eder.
   */
  const { max: budgetMax } = parseBudgetRange(brief.budget || "");

  const budgetFlags: string[] = [];

  if (budgetMax !== null && roleDetails.length > 0) {
    const perRole = budgetMax / roleDetails.length;
    if (perRole < 2000) {
      budgetFlags.push("Rol başına düşen bütçe düşük görünüyor — kapsamı veya bütçeyi gözden geçirmek isteyebilirsin.");
    }
  }

  return {
    detailedRoleAnalysis,
    skillCoverage: {
      totalRequiredSkills: new Set(roleDetails.flatMap((r) => r.requiredSkills ?? [])).size,
      rolesWithoutRequiredSkills,
    },
    skillGapInsights,
    budgetDurationAssessment: {
      hasBudget: budgetMax !== null,
      hasDeadline: Boolean(brief.deadline?.trim()),
      insight:
        "Bütçe ve teslim süresini 'Bütçe & Yayın' adımında belirleyeceksin; oradaki tutar roller arasında otomatik dağıtılır.",
      flags: budgetFlags,
    },
  };
}

export function buildProAnalysis(
  analysis: ProjectAnalysis,
  brief: ProjectBrief,
  plusAnalysis: PlusProjectAnalysis
): ProProjectAnalysis {
  const roleDetails = analysis.roleDetails ?? [];

  const teamCompositionInsight =
    roleDetails.length <= 1
      ? "Tek rollü bir kurulum — ekip kompozisyonu basit, koordinasyon riski düşük."
      : `${roleDetails.length} farklı rol var (${roleDetails
          .map((r) => r.role)
          .join(", ")}). Roller arasında sorumluluk çakışması olup olmadığını gözden geçir.`;

  const alternativeRoleSuggestions: string[] = [];

  if (roleDetails.length >= 3) {
    alternativeRoleSuggestions.push(
      "Çok sayıda dar kapsamlı rol yerine, birbirine yakın sorumlulukları tek bir rolde birleştirmeyi değerlendirebilirsin."
    );
  }

  if (plusAnalysis.skillCoverage.rolesWithoutRequiredSkills.length > 0) {
    alternativeRoleSuggestions.push(
      "Zorunlu becerisi eksik roller için genel bir 'Full Stack' veya 'Generalist' rolüne geçiş bir alternatif olabilir."
    );
  }

  if (alternativeRoleSuggestions.length === 0) {
    alternativeRoleSuggestions.push("Mevcut rol yapısı projenin kapsamına uygun görünüyor.");
  }

  const risks: string[] = [...plusAnalysis.budgetDurationAssessment.flags];

  if (roleDetails.length === 0) {
    risks.push("Hiçbir rol belirlenemedi — proje kapsamı netleştirilmeden ekip oluşturmak riskli olabilir.");
  }

  if (analysis.requiredSkills.length === 0) {
    risks.push("Genel proje becerisi belirtilmemiş.");
  }

  const riskLevel: ProProjectAnalysis["riskAnalysis"]["level"] =
    risks.length >= 3 ? "high" : risks.length >= 1 ? "medium" : "low";

  const { max: budgetMax } = parseBudgetRange(brief.budget || "");

  const advancedBudgetInsight =
    budgetMax !== null && roleDetails.length > 0
      ? `Toplam bütçenin rol başına ortalaması yaklaşık ${Math.round(budgetMax / roleDetails.length).toLocaleString("tr-TR")} — bunu piyasa koşullarıyla karşılaştırarak tekliflerin gerçekçiliğini değerlendirebilirsin.`
      : "Bütçeyi 'Bütçe & Yayın' adımında girdiğinde, rol başına dağılımını burada değerlendirebileceksin.";

  const advancedRecommendations = [...analysis.recommendations ?? []];

  if (plusAnalysis.skillGapInsights.length > 0 && !plusAnalysis.skillGapInsights[0].includes("tespit edilmedi")) {
    advancedRecommendations.push("Beceri boşluklarını kapatmak için rol tanımlarını güncellemeyi değerlendir.");
  }

  if (roleDetails.length > 1) {
    advancedRecommendations.push("Ekip içi koordinasyon için bir proje yöneticisi/lead rolü eklemeyi değerlendirebilirsin.");
  }

  return {
    teamCompositionInsight,
    alternativeRoleSuggestions,
    riskAnalysis: {
      level: riskLevel,
      risks: risks.length > 0 ? risks : ["Belirgin bir risk tespit edilmedi."],
    },
    advancedBudgetInsight,
    advancedRecommendations:
      advancedRecommendations.length > 0 ? advancedRecommendations : ["Ek öneri bulunmuyor."],
  };
}
