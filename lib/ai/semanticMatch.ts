import { cleanJsonOutput, generateJson } from "@/lib/ai/gemini";

/**
 * Semantic (Gemini) eşleştirme değerlendirmesi.
 *
 * ----------------------------------------------------------------------
 * NEDEN BU DOSYA VAR
 * ----------------------------------------------------------------------
 * Deterministic skorlama (lib/ai/match-talent.ts) rol adı ile freelancer
 * title/skills arasında kelime örtüşmesine dayanır. Bu, "Product Designer"
 * gibi rol adıyla birebir aynı olmayan ama işi gerçekten yapabilecek
 * profilleri haksız yere düşük puanlayabilir — ya da tersine, unvanı rol
 * adına uysa da gerçek beceri/deneyimi zayıf olan profilleri sırf başlık
 * benzerliğiyle öne çıkarabilir.
 *
 * Bu dosya SADECE "kararsız bölgedeki" (ne çok net eşleşme ne çok net
 * uyumsuzluk) adaylar için, TEK bir batch Gemini çağrısıyla anlamsal bir
 * ikinci görüş üretir. Sabit bir eşanlamlı/kelime listesi kullanmaz —
 * karar tamamen modele bırakılır.
 *
 * ----------------------------------------------------------------------
 * MALİYET KONTROLÜ
 * ----------------------------------------------------------------------
 * - Aday başına AYRI bir Gemini çağrısı YAPILMAZ. Çağıran taraf (bkz.
 *   match-talent.ts) kararsız bölgedeki adayları/rolleri tek bir listede
 *   toplar, buraya TEK bir istek olarak gönderir.
 * - MAX_PAIRS_PER_CALL ile token/maliyet sert bir üst sınıra bağlanır.
 * - Gemini yapılandırılmamışsa veya herhangi bir hata/parse sorunu
 *   olursa bu modül `null` döner — çağıran taraf deterministic sonuca
 *   sessizce geri düşer. Semantic katman asla matching akışını kıramaz.
 */

const MAX_PAIRS_PER_CALL = 12;

export type SemanticRoleContext = {
  name: string;
  responsibilities: string[];
  requiredSkills: string[];
  preferredSkills: string[];
};

export type SemanticFreelancerContext = {
  title: string | null;
  bio: string | null;
  skills: string[];
  expertise: string | null;
  experience: string | number | null;
  portfolio: string[];
};

export type SemanticPair = {
  /** Çağıranın sonucu geri eşleştirmek için kullandığı benzersiz anahtar. */
  pairId: string;
  role: SemanticRoleContext;
  freelancer: SemanticFreelancerContext;
  deterministicScore: number;
};

export type SemanticVerdict = {
  isMatch: boolean;
  score: number;
  reason: string;
};

export type SemanticProjectContext = {
  title: string;
  description: string | null;
  deliverables: string[];
};

function buildPrompt(
  project: SemanticProjectContext,
  pairs: SemanticPair[]
): string {
  const candidates = pairs.map((pair) => ({
    pairId: pair.pairId,
    role: {
      name: pair.role.name,
      responsibilities: pair.role.responsibilities.slice(0, 8),
      requiredSkills: pair.role.requiredSkills.slice(0, 12),
      preferredSkills: pair.role.preferredSkills.slice(0, 8),
    },
    freelancer: {
      title: pair.freelancer.title,
      bio: pair.freelancer.bio?.slice(0, 400) ?? null,
      skills: pair.freelancer.skills.slice(0, 20),
      expertise: pair.freelancer.expertise,
      experience: pair.freelancer.experience,
      portfolio: pair.freelancer.portfolio.slice(0, 5),
    },
    deterministicScore: pair.deterministicScore,
  }));

  return `
Sen CollaCrew freelance platformunda AI destekli bir eşleştirme
değerlendiricisisin.

GÖREV:
Her "aday" (candidates[]) için, freelancer'ın verilen proje rolündeki işi
GERÇEKTEN yapabilecek bilgi/beceri/deneyime sahip olup olmadığını
değerlendir.

TEMEL KURAL:
"Unvan (title) rol adıyla birebir aynı mı?" sorusu YANLIŞ sorudur.
Doğru soru: "Bu freelancer bu projedeki işi gerçekten yapabilir mi?"

- Unvanı rol adından farklı olsa bile (ör. "Product Designer" bir
  "UI/UX Designer" rolü için), ilgili beceri/deneyim/portfolyo varsa
  GÜÇLÜ bir eşleşme olabilir — bunu düşük puanlama.
- Tersine, unvanı rol adına birebir uysa bile beceri/deneyim/portfolyo
  bu rolün somut ihtiyaçlarını karşılamıyorsa eşleşme SAYMA — sırf
  başlık benzerliğiyle "isMatch: true" verme.
- Kararını rolün sorumlulukları, gerekli/tercih edilen becerileri ve
  proje açıklaması/teslimatları İLE freelancer'ın title, skills, bio,
  deneyimi ve portfolyosunu BİRLİKTE değerlendirerek ver.
- Sabit bir eşanlamlı listesi yok — bağlamı gerçekten anla.
- "deterministicScore" sana kaba bir referans olarak veriliyor
  (kelime örtüşmesine dayalı, hatalı olabilir) — kendi bağımsız
  değerlendirmeni yap, ona körü körüne güvenme.

PROJE:
Başlık: ${project.title}
Açıklama: ${(project.description ?? "(Belirtilmedi)").slice(0, 800)}
Teslimatlar: ${
    project.deliverables.length > 0
      ? project.deliverables.join(", ")
      : "(Belirtilmedi)"
  }

ADAYLAR:
${JSON.stringify(candidates)}

ÇIKTI:
Her aday için, SADECE aşağıdaki şemaya uyan bir JSON dizisi döndür.
Markdown, kod bloğu veya açıklama EKLEME.

[
  {
    "pairId": "string (yukarıdaki pairId ile birebir aynı)",
    "isMatch": true veya false,
    "score": 0-100 arası tam sayı (kendi bağımsız değerlendirmen),
    "reason": "Tek cümle, Türkçe, somut. Hangi beceri/deneyim/portfolyo bu kararı destekliyor ya da neden yetersiz kalıyor açıkla. Örnek: 'Product Designer olmasına rağmen UI/UX, Figma, Design Systems ve Web deneyimi nedeniyle bu proje için güçlü bir eşleşme.'"
  }
]
`;
}

function isValidVerdictEntry(
  value: unknown
): value is { pairId: string; isMatch: boolean; score: number; reason: string } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;

  return (
    typeof record.pairId === "string" &&
    record.pairId.trim().length > 0 &&
    typeof record.isMatch === "boolean" &&
    typeof record.score === "number" &&
    Number.isFinite(record.score) &&
    typeof record.reason === "string" &&
    record.reason.trim().length > 0
  );
}

/**
 * Kararsız bölgedeki rol/freelancer çiftlerini TEK bir batch Gemini
 * çağrısıyla değerlendirir.
 *
 * Başarısızlık durumunda (yapılandırma eksik, Gemini hatası, geçersiz
 * JSON) `null` döner — çağıran taraf bunu deterministic sonuca sessizce
 * geri dönme sinyali olarak kullanmalı.
 */
export async function reviewMatchPairs(
  project: SemanticProjectContext,
  pairs: SemanticPair[]
): Promise<Map<string, SemanticVerdict> | null> {
  if (pairs.length === 0) {
    return null;
  }

  const boundedPairs = pairs.slice(0, MAX_PAIRS_PER_CALL);

  if (pairs.length > MAX_PAIRS_PER_CALL) {
    console.warn(
      `[CollaCrew AI] Semantic match: ${pairs.length} aday geldi, ` +
        `maliyet sınırı nedeniyle ilk ${MAX_PAIRS_PER_CALL} tanesi değerlendiriliyor.`
    );
  }

  try {
    const output = await generateJson(
      buildPrompt(project, boundedPairs),
      { temperature: 0.2 }
    );

    const parsed = JSON.parse(cleanJsonOutput(output));

    if (!Array.isArray(parsed)) {
      console.warn(
        "[CollaCrew AI] Semantic match: beklenmeyen yanıt formatı (dizi değil)."
      );
      return null;
    }

    const verdicts = new Map<string, SemanticVerdict>();
    const knownPairIds = new Set(boundedPairs.map((pair) => pair.pairId));

    for (const entry of parsed) {
      if (!isValidVerdictEntry(entry) || !knownPairIds.has(entry.pairId)) {
        continue;
      }

      verdicts.set(entry.pairId, {
        isMatch: entry.isMatch,
        score: Math.min(100, Math.max(0, Math.round(entry.score))),
        reason: entry.reason.trim(),
      });
    }

    return verdicts.size > 0 ? verdicts : null;
  } catch (error) {
    console.error(
      "[CollaCrew AI] Semantic match değerlendirmesi başarısız oldu, " +
        "deterministic sonuca geri dönülüyor:",
      error
    );

    return null;
  }
}
