import type {
  ProjectBrief,
  ProjectAnalysis,
} from "@/types/ai";
import { cleanJsonOutput, generateJson, toSafeAiResponse } from "@/lib/ai/gemini";

/**
 * CollaCrew AI - Proje Analiz Endpoint'i
 *
 * Gemini çağrısı, model fallback ve retry mantığı artık merkezi
 * lib/ai/gemini.ts üzerinden yönetiliyor — bu dosya sadece prompt'u
 * ve CollaCrew'a özel doğrulama/normalize mantığını içerir.
 */

/**
 * String array alanlarını güvenli şekilde normalize eder.
 */
function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .filter(
          (item): item is string =>
            typeof item === "string"
        )
        .map((item) => item.trim())
        .filter(Boolean)
    )
  );
}

/**
 * AI'dan gelen analiz sonucunun beklediğimiz yapıda
 * olup olmadığını kontrol eder.
 */
function validateProjectAnalysis(
  value: unknown
): ProjectAnalysis {
  if (!value || typeof value !== "object") {
    throw new Error(
      "Gemini geçerli bir proje analiz nesnesi döndürmedi."
    );
  }

  const parsed =
    value as Record<string, unknown>;

  const requiredRoles =
    normalizeStringArray(
      parsed.requiredRoles
    );

  const requiredSkills =
    normalizeStringArray(
      parsed.requiredSkills
    );

  if (requiredRoles.length === 0) {
    throw new Error(
      "AI analizinde gerekli roller belirlenemedi."
    );
  }

  if (!Array.isArray(parsed.roleDetails)) {
    throw new Error(
      "AI analizinde rol detayları bulunamadı."
    );
  }

  if (parsed.roleDetails.length === 0) {
    throw new Error(
      "AI analizinde gerekli rol detayları oluşturulamadı."
    );
  }

  const roleDetails = parsed.roleDetails
    .filter(
      (detail): detail is Record<string, unknown> =>
        Boolean(
          detail &&
            typeof detail === "object"
        )
    )
    .map((detail) => ({
      role:
        typeof detail.role === "string"
          ? detail.role.trim()
          : "",

      responsibilities:
        normalizeStringArray(
          detail.responsibilities
        ),

      requiredSkills:
        normalizeStringArray(
          detail.requiredSkills
        ),

      preferredSkills:
        normalizeStringArray(
          detail.preferredSkills
        ),

      reason:
        typeof detail.reason === "string"
          ? detail.reason.trim()
          : "",
    }))
    .filter(
      (detail) => detail.role.length > 0
    );

  if (roleDetails.length === 0) {
    throw new Error(
      "AI analizinde geçerli rol detayları bulunamadı."
    );
  }

  /**
   * requiredRoles içerisinde olup roleDetails içerisinde
   * bulunmayan roller varsa analiz geçersiz kabul edilir.
   */
  const missingRoleDetails =
    requiredRoles.filter(
      (role) =>
        !roleDetails.some(
          (detail) =>
            detail.role.toLowerCase() ===
            role.toLowerCase()
        )
    );

  if (missingRoleDetails.length > 0) {
    throw new Error(
      `Bazı roller için detay oluşturulamadı: ${missingRoleDetails.join(
        ", "
      )}`
    );
  }

  return {
    ...parsed,
    requiredRoles,
    requiredSkills,
    roleDetails,
  } as ProjectAnalysis;
}

/**
 * CollaCrew proje analiz prompt'u.
 *
 * Buradaki amaç:
 * - Projenin ihtiyacını anlamak
 * - Gerekli freelancer rollerini çıkarmak
 * - Her rol için sorumlulukları belirlemek
 * - Required / preferred skill'leri ayırmak
 * - Client tarafındaki ekip oluşturma ekranına
 *   kullanılabilir temiz JSON döndürmek
 */
function buildPrompt(
  brief: ProjectBrief
) {
  return `
Sen CollaCrew isimli freelance proje platformunun
AI proje analiz asistanısın.

Görevin, client tarafından girilen proje bilgisini analiz ederek
proje için gerekli freelancer rollerini ve her rolün ihtiyaçlarını
belirlemektir.

AMAÇ:
Client'ın projesini doğru anlayarak:
1. Gerekli freelancer rollerini belirle.
2. Her rolün sorumluluklarını çıkar.
3. Her rol için gerekli teknik / profesyonel becerileri belirle.
4. Tercih edilen ancak zorunlu olmayan becerileri belirle.
5. Her rolün neden gerekli olduğunu kısa şekilde açıkla.
6. Projeye gereksiz roller ekleme.
7. Aynı işi yapan benzer rolleri gereksiz yere çoğaltma.
8. Mümkün olduğunca gerçek freelance iş piyasasında kullanılan
   rol isimlerini kullan.

ÖNEMLİ:
- Rol isimleri kısa ve profesyonel olmalı.
- Örneğin:
  "UI/UX Designer"
  "Frontend Developer"
  "Backend Developer"
  "Full Stack Developer"
  "Graphic Designer"
  "Digital Marketing Specialist"
  "SEO Specialist"
  "Content Writer"
  "Social Media Manager"
  "3D Artist"
  "Motion Designer"
  "Brand Designer"
  gibi gerçek ve anlaşılır rol isimleri kullan.
- Gereksiz şekilde "Senior", "Junior" gibi seviyeler ekleme.
- Bir rol başka bir rolün sorumluluğunu zaten karşılıyorsa
  ikinci bir rol oluşturma.
- Proje yalnızca bir uzmanla yapılabiliyorsa gereksiz büyük ekip
  önerme.
- Projenin açıklamasında açıkça belirtilmeyen bir uzmanlığı
  varsayarak ekleme.
- Ancak projenin tamamlanması için açıkça gerekli olan uzmanlıkları
  belirleyebilirsin.

CLIENT'IN SEÇTİĞİ UZMANLIK VE BECERİLER (ÇOK ÖNEMLİ):
- Client, rol analizinden önce genel uzmanlık alanlarını ve
  becerilerini kendisi seçmiştir. Bu seçimler client'ın açıkça
  belirttiği ihtiyaçlardır ve kaybedilmemelidir.
- Client'ın seçtiği uzmanlık alanlarını, hangi rollerin gerekli
  olduğuna karar verirken doğrudan girdi olarak kullan.
- Client'ın seçtiği her beceriyi, en uygun olduğu role
  requiredSkills veya preferredSkills alanına dağıt. Bir beceri
  birden fazla rolle ilgiliyse en uygun role ata; aynı beceriyi
  gereksiz yere her role tekrar ekleme.
- Client'ın seçtiği bir beceri hiçbir önerilen role uymuyorsa
  bile, en yakın ilgili role preferredSkills olarak ekle;
  sessizce yok sayma.
- roleDetails içindeki requiredSkills/preferredSkills SADECE
  client'ın seçtiği becerilerle sınırlı kalmak zorunda değil;
  gerekirse projeye uygun ek beceriler de önerebilirsin, ancak
  client'ın seçtiği becerileri mutlaka bir role yerleştir.

PROJE BİLGİLERİ:

Başlık:
${brief.title || "(Belirtilmedi)"}

Açıklama:
${brief.description}

Hedefler:
${brief.goals || "(Belirtilmedi)"}

Bağlam:
${brief.context || "(Belirtilmedi)"}

Ek gereksinimler:
${brief.requirements || "(Belirtilmedi)"}

Client'ın seçtiği uzmanlık alanları:
${
  brief.expertise && brief.expertise.length > 0
    ? brief.expertise.join(", ")
    : "(Belirtilmedi)"
}

Client'ın seçtiği beceriler:
${
  brief.skills && brief.skills.length > 0
    ? brief.skills.join(", ")
    : "(Belirtilmedi)"
}

Bütçe:
${brief.budget || "(Belirtilmedi)"}

Teslim süresi:
${brief.deadline || "(Belirtilmedi)"}

ANALİZ KURALLARI:

- requiredRoles sadece gerekli rollerin isimlerinden oluşmalı.
- requiredSkills proje genelindeki önemli gerekli becerileri
  içermeli.
- roleDetails içerisindeki her nesne requiredRoles içerisindeki
  bir rolle eşleşmeli.
- Her rol için:
  - role
  - responsibilities
  - requiredSkills
  - preferredSkills
  - reason
  alanlarını oluştur.
- responsibilities somut işlerden oluşmalı.
- requiredSkills gerçekten gerekli becerileri içermeli.
- preferredSkills işi daha iyi yapabilecek ancak zorunlu olmayan
  becerileri içermeli.
- reason kısa ve client'ın anlayabileceği şekilde yazılmalı.

BÜTÇE:
Bütçeyi roller arasında dağıtma.
Rol başına fiyat belirleme.
Freelancer ücretlerini tahmin etme.
Sadece proje kapsamını ve gerekli ekip yapısını analiz et.

ÇIKTI:
SADECE geçerli JSON döndür.
Markdown kullanma.
Kod bloğu kullanma.
Açıklama ekleme.

JSON ŞEMASI:

{
  "requiredRoles": [
    "string"
  ],
  "requiredSkills": [
    "string"
  ],
  "roleDetails": [
    {
      "role": "string",
      "responsibilities": [
        "string"
      ],
      "requiredSkills": [
        "string"
      ],
      "preferredSkills": [
        "string"
      ],
      "reason": "string"
    }
  ]
}

Şimdi projeyi analiz et ve yalnızca JSON döndür.
`;
}

/**
 * Gemini'yi merkezi helper üzerinden çağırır (retry + model fallback
 * lib/ai/gemini.ts içinde yönetiliyor) ve sonucu CollaCrew'a özel
 * şemaya göre doğrular.
 */
async function generateProjectAnalysis(
  prompt: string
): Promise<ProjectAnalysis> {
  const output = await generateJson(prompt, { temperature: 0.2 });
  const cleanedOutput = cleanJsonOutput(output);

  let parsed: unknown;

  try {
    parsed = JSON.parse(cleanedOutput);
  } catch {
    console.error(
      "Gemini JSON parse hatası. Model çıktısı:",
      cleanedOutput.slice(0, 2000)
    );

    throw new Error(
      "Gemini geçerli bir analiz formatı döndürmedi."
    );
  }

  return validateProjectAnalysis(parsed);
}

/**
 * POST /api/ai/analyze-project
 */
export async function POST(
  request: Request
) {
  try {
    /**
     * API key kontrolü.
     */
    if (
      !process.env.GEMINI_API_KEY?.trim()
    ) {
      console.error(
        "[CollaCrew AI] GEMINI_API_KEY eksik."
      );

      return Response.json(
        {
          error:
            "AI servisi yapılandırılmamış. GEMINI_API_KEY eksik.",
        },
        {
          status: 500,
        }
      );
    }

    /**
     * Request body.
     */
    const body =
      (await request.json()) as
        | Partial<ProjectBrief> & {
            brief?: Partial<ProjectBrief>;
          };

    /**
     * Hem:
     *
     * {
     *   title,
     *   description
     * }
     *
     * hem de:
     *
     * {
     *   brief: {
     *     title,
     *     description
     *   }
     * }
     *
     * formatlarını destekliyoruz.
     */
    const input =
      body.brief ?? body;

    /**
     * Description zorunlu.
     */
    if (
      typeof input.description !==
        "string" ||
      !input.description.trim()
    ) {
      return Response.json(
        {
          error:
            "Proje açıklaması zorunludur.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * ProjectBrief oluştur.
     */
    const brief: ProjectBrief = {
      title:
        typeof input.title ===
        "string"
          ? input.title.trim()
          : "",

      description:
        input.description.trim(),

      goals:
        typeof input.goals ===
        "string"
          ? input.goals.trim()
          : input.goals,

      context:
        typeof input.context ===
        "string"
          ? input.context.trim()
          : input.context,

      requirements:
        typeof input.requirements ===
        "string"
          ? input.requirements.trim()
          : input.requirements,

      expertise:
        normalizeStringArray(
          input.expertise
        ),

      skills:
        normalizeStringArray(
          input.skills
        ),

      budget:
        typeof input.budget ===
        "string"
          ? input.budget
          : String(
              input.budget ?? ""
            ),

      deadline:
        typeof input.deadline ===
        "string"
          ? input.deadline
          : "",
    };

    /**
     * Prompt oluştur.
     */
    const prompt =
      buildPrompt(brief);

    /**
     * Gemini + fallback sistemi.
     */
    const analysis =
      await generateProjectAnalysis(
        prompt
      );

    return Response.json(
      {
        analysis,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    const { status, body: responseBody } = toSafeAiResponse(error, [
      "GEMINI_API_KEY tanımlı değil.",
      "AI analizinde gerekli roller belirlenemedi.",
      "AI analizinde rol detayları bulunamadı.",
      "AI analizinde gerekli rol detayları oluşturulamadı.",
      "AI analizinde geçerli rol detayları bulunamadı.",
      "Gemini geçerli bir proje analiz nesnesi döndürmedi.",
      "Gemini geçerli bir analiz formatı döndürmedi.",
    ]);

    return Response.json(responseBody, { status });
  }
}