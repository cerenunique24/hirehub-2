import { matchSkills } from "@/lib/matching";

/**
 * Freelancer profil gelişim analizi — Premium "Profil Gelişim Analizi"
 * ve "Profil Optimizasyon Önerileri" için ortak, deterministic
 * hesaplama.
 *
 * Rastgele/uydurma bir "puan" ÜRETİLMEZ — tek sayısal skor olarak
 * mevcut `profiles.profile_completion` alanı (zaten sistemde var olan,
 * gerçek bir alan) kullanılır. Buradaki gözlem/öneriler açıklanabilir
 * kurallara dayanır: alan doluluğu, kelime/skill örtüşümü, sayım.
 */

export type ProfileForInsights = {
  title: string | null;
  bio: string | null;
  expertise: string | null;
  skills: string[] | null;
  workTypes: string[] | null;
  languages: string[] | null;
  experience: string | null;
  hourlyRate: number | null;
  availabilityStatus: string | null;
  profileCompletion: number | null;
  portfolioCount: number;
};

export type ProfileInsight = {
  area: "title" | "expertise" | "skills" | "portfolio" | "bio";
  severity: "good" | "info" | "warning";
  observation: string;
  suggestion: string | null;
};

export type ProfileOptimizationSuggestion = {
  area: "title" | "expertise" | "skills" | "portfolio" | "bio";
  current: string | null;
  suggestion: string;
  reason: string;
};

export type ProfileAnalysis = {
  completionScore: number;
  insights: ProfileInsight[];
  suggestions: ProfileOptimizationSuggestion[];
};

function splitWords(value: string): string[] {
  return value
    .split(/[\s,/&+()|-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
}

export function analyzeProfile(profile: ProfileForInsights): ProfileAnalysis {
  const insights: ProfileInsight[] = [];
  const suggestions: ProfileOptimizationSuggestion[] = [];

  const skills = profile.skills ?? [];
  const uniqueSkillKeys = new Set(skills.map((s) => s.trim().toLowerCase()));
  const hasDuplicateSkills = uniqueSkillKeys.size < skills.length;

  /* ---------------------------------------------------------------- */
  /* Başlık ↔ Uzmanlık/Beceri uyumu                                    */
  /* ---------------------------------------------------------------- */

  if (profile.title && profile.title.trim()) {
    const titleWords = splitWords(profile.title);
    const alignment = matchSkills(titleWords, skills);

    if (titleWords.length > 0 && skills.length > 0) {
      if (alignment.percentage >= 50) {
        insights.push({
          area: "title",
          severity: "good",
          observation: `"${profile.title}" başlığın ile ${alignment.matchingSkills
            .slice(0, 3)
            .join(", ")} becerilerin birbiriyle uyumlu.`,
          suggestion: null,
        });
      } else {
        insights.push({
          area: "title",
          severity: "info",
          observation: `"${profile.title}" başlığın, eklediğin becerilerin sadece %${alignment.percentage}'i ile doğrudan örtüşüyor.`,
          suggestion:
            "Başlığını en güçlü 2-3 becerini yansıtacak şekilde güncellemek profilinin daha net görünmesini sağlayabilir.",
        });

        suggestions.push({
          area: "title",
          current: profile.title,
          suggestion: `${profile.title} | ${skills.slice(0, 2).join(" & ")}`,
          reason: "Başlık, profildeki güçlü becerilerini şu anda yeterince yansıtmıyor.",
        });
      }
    } else {
      insights.push({
        area: "title",
        severity: "info",
        observation: `"${profile.title}" başlığın net ancak beceri listen henüz karşılaştırma yapılamayacak kadar kısa.`,
        suggestion: "Başlığınla ilgili birkaç beceri daha ekleyerek profilinin uyumunu güçlendirebilirsin.",
      });
    }
  } else {
    insights.push({
      area: "title",
      severity: "warning",
      observation: "Profilinde henüz bir başlık bulunmuyor.",
      suggestion: "Uzmanlığını 3-6 kelimeyle özetleyen bir başlık eklemek, keşfet ekranındaki görünürlüğünü artırır.",
    });
  }

  /* ---------------------------------------------------------------- */
  /* Uzmanlık alanı                                                     */
  /* ---------------------------------------------------------------- */

  if (!profile.expertise || !profile.expertise.trim()) {
    insights.push({
      area: "expertise",
      severity: "warning",
      observation: "Uzmanlık alanı bilgisi eksik.",
      suggestion: "Hangi alanlarda çalıştığını (ör. UI/UX Design, Full Stack Development) belirtmek eşleşme kalitesini artırır.",
    });
  } else if (profile.expertise.trim().length < 20) {
    insights.push({
      area: "expertise",
      severity: "info",
      observation: "Uzmanlık alanların daha spesifik tanımlanabilir.",
      suggestion: "Genel bir ifade yerine somut alt uzmanlıklar (ör. 'Design Systems', 'SaaS Dashboard Tasarımı') eklemeyi değerlendirebilirsin.",
    });
  } else {
    insights.push({
      area: "expertise",
      severity: "good",
      observation: "Uzmanlık alanların ayrıntılı şekilde tanımlanmış.",
      suggestion: null,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Portfolio                                                          */
  /* ---------------------------------------------------------------- */

  if (profile.portfolioCount === 0) {
    insights.push({
      area: "portfolio",
      severity: "warning",
      observation: "Portfolio alanında henüz hiç örnek bulunmuyor.",
      suggestion: "En az 2-3 çalışma eklemek, client'ların profiline güven duymasını kolaylaştırır.",
    });

    suggestions.push({
      area: "portfolio",
      current: "0 proje",
      suggestion: "Portfolyona en az 2-3 tamamlanmış proje ekle.",
      reason: "Portfolio boş olduğunda client'lar geçmiş işlerini değerlendiremiyor.",
    });
  } else if (profile.portfolioCount < 3) {
    insights.push({
      area: "portfolio",
      severity: "info",
      observation: `Portfolio alanında ${profile.portfolioCount} proje bulunuyor.`,
      suggestion: "Daha fazla örnek eklemek profil güvenini artırabilir.",
    });
  } else {
    insights.push({
      area: "portfolio",
      severity: "good",
      observation: `Portfolio alanında ${profile.portfolioCount} proje bulunuyor.`,
      suggestion: null,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Skills                                                             */
  /* ---------------------------------------------------------------- */

  if (skills.length === 0) {
    insights.push({
      area: "skills",
      severity: "warning",
      observation: "Profilinde henüz beceri eklenmemiş.",
      suggestion: "İlgili yazılım/araç ve yetkinliklerini eklemek eşleşme oranını doğrudan etkiler.",
    });
  } else if (hasDuplicateSkills) {
    insights.push({
      area: "skills",
      severity: "info",
      observation: "Beceri listende birbirini tekrar eden girişler var.",
      suggestion: "Tekrarlanan becerileri temizleyip yerine farklı yetkinlikler eklemek listeyi daha güçlü gösterir.",
    });
  } else if (skills.length < 3) {
    insights.push({
      area: "skills",
      severity: "info",
      observation: `Profilinde ${skills.length} beceri bulunuyor.`,
      suggestion: "Uzmanlık alanınla ilgili birkaç beceri daha eklemek eşleşme çeşitliliğini artırabilir.",
    });
  } else {
    insights.push({
      area: "skills",
      severity: "good",
      observation: `Profilinde ${skills.length} beceri bulunuyor.`,
      suggestion: null,
    });
  }

  /* ---------------------------------------------------------------- */
  /* Bio                                                                */
  /* ---------------------------------------------------------------- */

  const bioLength = profile.bio?.trim().length ?? 0;

  if (bioLength === 0) {
    insights.push({
      area: "bio",
      severity: "warning",
      observation: "Hakkımda bölümü henüz doldurulmamış.",
      suggestion: "Kısa bir tanıtım metni, kimlerle nasıl çalıştığını anlatarak client güvenini artırır.",
    });
  } else if (bioLength < 80) {
    insights.push({
      area: "bio",
      severity: "info",
      observation: "Hakkımda bölümün kısa.",
      suggestion: "Deneyimini ve çalışma şeklini birkaç cümleyle genişletmek profilini daha ikna edici yapabilir.",
    });
  } else {
    insights.push({
      area: "bio",
      severity: "good",
      observation: "Hakkımda bölümün yeterince detaylı.",
      suggestion: null,
    });
  }

  return {
    completionScore: profile.profileCompletion ?? 0,
    insights,
    suggestions,
  };
}
