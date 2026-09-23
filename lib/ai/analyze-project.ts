import { GoogleGenerativeAI } from "@google/generative-ai";
import type { ProjectBrief, ProjectAnalysis } from "@/types/ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const MAX_RETRIES = 1;
const RETRY_DELAY = 1000;

function isRetryableError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  const message = error.message.toLowerCase();

  return (
    message.includes("503") ||
    message.includes("service unavailable") ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("429") ||
    message.includes("rate limit")
  );
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeProject(
  brief: ProjectBrief
): Promise<ProjectAnalysis> {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY tanımlı değil.");
  }

  const model = genAI.getGenerativeModel({
    model: "gemini-3.6-flash",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.2,
    },
  });

  const prompt = [
    "Sen CollaCrew AI proje analiz motorusun.",
    "",
    "Müşterinin proje brief'ini kısa ve profesyonel şekilde analiz et.",
    "",
    "Kurallar:",
    "- Sadece geçerli JSON döndür.",
    "- Markdown kullanma.",
    "- Tüm metinler Türkçe olsun.",
    "- Brief'te olmayan bilgileri kesin gerçek gibi uydurma.",
    "- Gereksiz uzun açıklamalar üretme.",
    "- Bir freelancer yeterliyse büyük ekip önerme.",
    "- Karmaşık projelerde uygun ekip büyüklüğünü belirt.",
    "- requiredRoles gerçek freelance rollerinden oluşmalı.",
    "- requiredSkills gerçek teknik veya profesyonel becerilerden oluşmalı.",
    "- Freelancer veya aday ismi önerme; yalnızca proje ihtiyaçlarını analiz et.",
    "- Her rol için roleDetails içinde ayrı, role özel beceriler üret.",
    "- Basit işler için gereksiz roller ekleme.",
    '- estimatedBudget yalnızca verilen bütçeyi dikkate almalı.',
    '- Bütçe belirtilmemişse "Belirtilmedi" yaz.',
    "",
    "JSON formatı:",
    "",
    "{",
    '  "summary": "En fazla 2 cümlelik proje özeti",',
    '  "category": "Proje kategorisi",',
    '  "complexity": "Low | Medium | High",',
    '  "goals": ["En fazla 3 hedef"],',
    '  "keyRequirements": ["En fazla 5 gereksinim"],',
    '  "requiredExpertise": ["En fazla 4 uzmanlık"],',
    '  "requiredRoles": ["En fazla 4 rol"],',
    '  "requiredSkills": ["En fazla 8 beceri"],',
    '  "roleDetails": [{',
    '    "role": "Rol adı",',
    '    "reason": "Bu rolün neden gerekli olduğu",',
    '    "responsibilities": ["Ana sorumluluk"],',
    '    "requiredSkills": ["Bu role özel zorunlu beceri"],',
    '    "preferredSkills": ["Tercih edilen beceri"]',
    '  }],',
    '  "deliverables": ["En fazla 5 teslimat"],',
    '  "estimatedTimeline": "Kısa tahmini süre",',
    '  "estimatedBudget": "Bütçe",',
    '  "recommendedTeamSize": 1,',
    '  "insights": "En fazla 2 cümlelik analiz",',
    '  "recommendations": ["En fazla 3 öneri"],',
    '  "considerations": ["En fazla 3 dikkat noktası"]',
    "}",
    "",
    "PROJE BİLGİLERİ:",
    "",
    "Başlık:",
    brief.title || "Belirtilmedi",
    "",
    "Açıklama:",
    brief.description,
    "",
    "Hedefler:",
    brief.goals || "Belirtilmedi",
    "",
    "Bağlam:",
    brief.context || "Belirtilmedi",
    "",
    "Gereksinimler:",
    brief.requirements || "Belirtilmedi",
    "",
    "Bütçe:",
    brief.budget || "Belirtilmedi",
    "",
    "Teslim tarihi:",
    brief.deadline || "Belirtilmedi",
  ].join("\n");

  let lastError: unknown = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const output = result.response.text().trim();

      if (!output) {
        throw new Error("AI analiz sonucu alınamadı.");
      }

      try {
        const parsed = JSON.parse(output) as ProjectAnalysis;

        if (
          !Array.isArray(parsed.requiredRoles) ||
          !Array.isArray(parsed.requiredSkills) ||
          !Array.isArray(parsed.roleDetails) ||
          parsed.roleDetails.some(
            (role) =>
              !role ||
              typeof role.role !== "string" ||
              !Array.isArray(role.responsibilities) ||
              !Array.isArray(role.requiredSkills) ||
              !Array.isArray(role.preferredSkills)
          )
        ) {
          throw new Error("AI analiz sonucu beklenen rol detaylarını içermiyor.");
        }

        return parsed;
      } catch {
        throw new Error("Gemini geçerli bir analiz formatı döndürmedi.");
      }
    } catch (error) {
      lastError = error;

      if (!isRetryableError(error) || attempt >= MAX_RETRIES) {
        throw error;
      }

      console.warn(
        "CollaCrew AI geçici olarak kullanılamıyor. Yeniden deneniyor..."
      );

      await wait(RETRY_DELAY);
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error(
        "CollaCrew AI analiz sırasında beklenmeyen bir hata oluştu."
      );
}

