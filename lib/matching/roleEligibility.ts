import { detectCanonicalRoles, isDirectRoleRelevance, type RoleRelevance } from "@/lib/matching/roleRelevance";
import { normalizeMatchText } from "@/lib/utils/normalizeMatchText";

/**
 * Deterministic role-family eligibility.
 *
 * Bu dosya matchScore (0-100, ne kadar iyi eşleştiği) ile
 * isEligibleForRole (true/false, teklif gönderebilir mi) kavramlarını
 * birbirinden ayırır.
 *
 * Kullanım yerleri:
 * - lib/ai/match-talent.ts (Discover liste + proje detay + API route)
 * - app/api/proposals/route.ts (server-side proposal validation)
 *
 * Aynı freelancer, aynı project/role için, hangi sayfadan bakılırsa
 * bakılsın AYNI eligibility sonucunu almalı — bu yüzden tek bir yerde
 * tanımlanır.
 */

/**
 * Match yüzdesi tek başına yeterli değildir. Skor bu eşiğin altındaysa
 * profil role-family olarak uygun olsa bile teklif gönderilemez.
 */
export const ELIGIBILITY_MATCH_THRESHOLD = 40;

export type RoleFamily =
  | "architecture"
  | "engineering_civil"
  | "engineering_mechanical"
  | "engineering_electrical"
  | "design"
  | "marketing"
  | "development"
  | "data_science"
  | "writing"
  | "project_management"
  | "video"
  | "photography"
  | "animation_3d"
  | "finance_accounting"
  | "legal"
  | "translation"
  | "voice_audio"
  | "hr_recruitment"
  | "sales_business"
  | "customer_support"
  | "education_training";

/**
 * Her aile için Türkçe/İngilizce anahtar kelime/öbek listesi.
 *
 * Hem meslek unvanları (ör. "Architect") hem de o meslekte sık kullanılan
 * yazılım/araç adları (ör. "Revit", "AutoCAD") dahildir — freelancer
 * profilinin unvanı genel olsa bile skills listesindeki araçlar family
 * sinyalini güçlendirir.
 *
 * ÖNEMLİ: buradaki öbekler kasıtlı olarak "design" / "tasarım" gibi tek
 * başına çok genel kelimeler İÇERMEZ — "Interior Design", "Furniture
 * Design", "Architectural Design" gibi mimarlıkla ilgili bileşik
 * ifadeler graphic/brand design ailesiyle yanlışlıkla eşleşmesin diye.
 * Aynı prensip diğer aileler için de geçerlidir: aile ayrımı gereken
 * meslekler arasında paylaşılan tek kelimeler (ör. "engineer", "design",
 * "developer") tek başına anahtar kelime olarak kullanılmaz.
 */
const ROLE_FAMILY_KEYWORDS: Record<RoleFamily, string[]> = {
  architecture: [
    "architect",
    "architecture",
    "architectural design",
    "architectural",
    "interior architect",
    "interior design",
    "interior designer",
    "furniture design",
    "space planning",
    "landscape architecture",
    "landscape architect",
    "urban design",
    "urban planner",
    "urban planning",
    "restoration architect",
    "mimar",
    "mimari",
    "mimarlık",
    "iç mimar",
    "ic mimar",
    "peyzaj mimarı",
    "peyzaj mimarlığı",
    "kentsel tasarım",
    "kentsel tasarim",
    "şehir plancısı",
    "sehir plancisi",
    "şehir ve bölge planlama",
    "sehir ve bolge planlama",
    "restorasyon mimarı",
    "restorasyon mimari",
    "mekan tasarımı",
    "mekan tasarimi",
    "mimari proje",
    "bina bilgi modelleme",
    "architectural visualizer",
    "architectural visualization",
    "mimari görselleştirici",
    "mimari gorsellestirici",
    "mimari görselleştirme",
    "mimari gorsellestirme",
    "cad designer",
    "cad tasarımcısı",
    "cad tasarimcisi",
    "autocad",
    "revit",
    "archicad",
    "sketchup",
    "3ds max",
    "3d studio max",
    "rhino",
    "rhinoceros",
    "lumion",
    "v-ray",
    "vray",
    "twinmotion",
    "enscape",
  ],

  engineering_civil: [
    "civil engineer",
    "civil engineering",
    "structural engineer",
    "structural engineering",
    "inşaat mühendisi",
    "insaat muhendisi",
    "inşaat mühendisliği",
    "insaat muhendisligi",
    "statik mühendisi",
    "statik muhendisi",
    "yapı mühendisi",
    "yapi muhendisi",
    "yapı statiği",
    "yapi statigi",
  ],

  engineering_mechanical: [
    "mechanical engineer",
    "mechanical engineering",
    "makine mühendisi",
    "makine muhendisi",
    "makine mühendisliği",
    "makine muhendisligi",
    "ürün tasarım mühendisi",
    "urun tasarim muhendisi",
    "solidworks",
    "catia",
    "ansys",
  ],

  engineering_electrical: [
    "electrical engineer",
    "electrical engineering",
    "electronics engineer",
    "electronic engineer",
    "elektrik mühendisi",
    "elektrik muhendisi",
    "elektronik mühendisi",
    "elektronik muhendisi",
    "elektrik elektronik mühendisi",
    "gömülü sistem mühendisi",
    "gomulu sistem muhendisi",
    "embedded systems engineer",
    "pcb design",
    "pcb tasarımı",
  ],

  design: [
    "graphic designer",
    "graphic design",
    "grafik tasarım",
    "grafik tasarimci",
    "grafik tasarımcı",
    "brand designer",
    "brand design",
    "marka tasarım",
    "marka tasarimcisi",
    "marka tasarımcısı",
    "visual designer",
    "visual design",
    "görsel tasarım",
    "gorsel tasarim",
    "logo design",
    "logo tasarım",
    "illustrator",
    "illüstrasyon",
    "illustration",
    "ui designer",
    "ux designer",
    "ui/ux",
    "ui ux",
    "product designer",
    "arayüz tasarımı",
    "arayuz tasarimi",
    "kullanıcı deneyimi tasarımı",
    "packaging design",
    "ambalaj tasarımı",
    "ambalaj tasarimi",
    "typography",
    "tipografi",
    "editorial design",
    "figma",
    "adobe xd",
    "adobe photoshop",
    "adobe illustrator",
    "adobe indesign",
    "coreldraw",
    "corel draw",
    "procreate",
  ],

  marketing: [
    "performance marketer", "growth marketer", "social media specialist", "content marketer",
    "marketing", "pazarlama",
    "digital marketing",
    "dijital pazarlama",
    "marketing specialist",
    "marketing consultant",
    "pazarlama uzmanı",
    "pazarlama uzmani",
    "pazarlama danışmanı",
    "pazarlama danismani",
    "social media marketing",
    "sosyal medya pazarlama",
    "sosyal medya uzmanı",
    "seo",
    "sem",
    "ppc uzmanı",
    "ppc specialist",
    "reklam stratejisti",
    "advertising strategist",
    "performance marketing",
    "growth marketing",
    "content marketing",
    "içerik pazarlama",
    "email marketing",
    "e-posta pazarlama",
    "meta ads",
    "google ads",
    "influencer marketing",
    "affiliate marketing",
    "e-ticaret pazarlama",
    "ecommerce marketing",
    "marka yöneticisi",
    "marka yoneticisi",
    "brand manager",
  ],

  development: [
    "full stack",
    "full-stack",
    "fullstack",
    "frontend developer",
    "front-end developer",
    "backend developer",
    "back-end developer",
    "software developer",
    "software engineer",
    "web developer",
    "yazılım geliştirici",
    "yazilim gelistirici",
    "yazılım mühendisi",
    "yazilim muhendisi",
    "web geliştirici",
    "web gelistirici",
    "mobile developer",
    "mobil uygulama geliştirici",
    "mobil uygulama gelistirici",
    "react developer",
    "node developer",
    "uygulama geliştirici",
    "uygulama gelistirici",
    "ios developer",
    "android developer",
    "react native",
    "flutter developer",
    "swift developer",
    "kotlin developer",
    "devops engineer",
    "devops mühendisi",
    "devops muhendisi",
    "qa engineer",
    "test mühendisi",
    "test muhendisi",
    "unity developer",
    "unreal developer",
    "game developer",
    "oyun geliştirici",
    "oyun gelistirici",
    "wordpress developer",
    "shopify developer",
    "php developer",
    "python developer",
    "java developer",
    ".net developer",
    "laravel developer",
    "api developer",
  ],

  data_science: [
    "data scientist",
    "veri bilimci",
    "data analyst",
    "veri analisti",
    "machine learning engineer",
    "makine öğrenmesi mühendisi",
    "makine ogrenmesi muhendisi",
    "yapay zeka mühendisi",
    "yapay zeka muhendisi",
    "ai engineer",
    "business intelligence",
    "iş zekası uzmanı",
    "is zekasi uzmani",
    "veri mühendisi",
    "veri muhendisi",
    "data engineer",
  ],

  writing: [
    "book writer", "novelist", "creative writer", "story writer", "senaryo", "hikaye",
    "copywriter",
    "copywriting",
    "content writer",
    "içerik yazarı",
    "icerik yazari",
    "metin yazarı",
    "metin yazari",
    "technical writer",
    "senarist",
    "screenwriter",
    /*
     * Bare "editör"/"editor" KASITLI OLARAK burada değil — "Video
     * Editor"/"Photo Editor" gibi alakasız rollerin substring ile
     * writing family'ye sızmasına yol açıyordu (bkz. matching audit,
     * video/photography family ayrımı). İçerik/yayın editörlüğüne
     * özgü bileşik ifadeler kullanılıyor.
     */
    "içerik editörü",
    "icerik editoru",
    "metin editörü",
    "metin editoru",
    "yayın editörü",
    "yayin editoru",
    "kitap editörü",
    "kitap editoru",
    "content editor",
    "redaktör",
    "redaktor",
    "proofreader",
    "blog yazarı",
    "blog yazari",
    "ghostwriter",
    "hayalet yazar",
    "akademik yazar",
    "academic writer",
    /*
     * "Kitap yazma projesi + Senarist" audit'inde AI'nın ürettiği genel
     * yazarlık rolleri (bare "yazar" değil — o generic tek kelime, aile
     * tespitinde false-positive riski taşır, bkz. dosya başındaki not)
     * ile gerçek kitap/senaryo yazarlığı unvanları arasındaki boşluğu
     * kapatır.
     */
    "kitap yazarı",
    "kitap yazari",
    "roman yazarı",
    "roman yazari",
    "hikaye yazarı",
    "hikaye yazari",
    "senaryo yazarı",
    "senaryo yazari",
    "öykü yazarı",
    "oyku yazari",
  ],

  project_management: [
    "project manager",
    "proje yöneticisi",
    "proje yonetici",
    "scrum master",
    "product manager",
    "ürün yöneticisi",
    "urun yoneticisi",
    "ürün sahibi",
    "urun sahibi",
    "product owner",
    "agile coach",
  ],

  /*
   * ÖNEMLİ: "video" ve "photography" KASITLI OLARAK ayrı aileler
   * (eskiden tek "video_photo" ailesiydi). Bir Video Editor ile bir
   * Photographer aynı proje türünde (video/foto prodüksiyon) çalışsa
   * bile GERÇEK İŞLERİ farklı — biri diğerinin yerine role-eligible
   * sayılmamalı (bkz. matching audit, "Fotoğraf + Video Editor" test
   * senaryosu).
   */
  video: [
    "video editor",
    "video editörü",
    "video editoru",
    "videographer",
    "video producer",
    "video yapımcısı",
    "video yapimcisi",
    "motion designer",
    "motion graphics",
    "post production specialist",
    "post prodüksiyon uzmanı",
    "post produksiyon uzmani",
    "animator",
    "animatör",
    "character animator",
  ],

  photography: [
    "photographer",
    "fotoğrafçı",
    "fotografci",
    "product photographer",
    "ürün fotoğrafçısı",
    "urun fotografcisi",
    "fashion photographer",
    "moda fotoğrafçısı",
    "moda fotografcisi",
    "event photographer",
    "etkinlik fotoğrafçısı",
    "etkinlik fotografcisi",
    "photo editor",
    "fotoğraf editörü",
    "fotograf editoru",
    "retoucher",
    "rötuşçu",
    "rotuscu",
  ],

  animation_3d: [
    "3d animator",
    "3d modeler",
    "3d modelleyici",
    "character animator",
    "karakter animatörü",
    "karakter animatoru",
    "karakter tasarımcısı",
    "karakter tasarimcisi",
    "game designer",
    "oyun tasarımcısı",
    "oyun tasarimcisi",
    "blender",
    "cinema 4d",
    "maya",
    "zbrush",
  ],

  finance_accounting: [
    "accountant",
    "muhasebeci",
    "mali müşavir",
    "mali musavir",
    "financial analyst",
    "mali analist",
    "finansal analist",
    "finansal danışman",
    "finansal danisman",
    "bookkeeping",
    "bütçe uzmanı",
    "butce uzmani",
  ],

  legal: [
    "lawyer",
    "attorney",
    "avukat",
    "hukuk müşaviri",
    "hukuk musaviri",
    "legal consultant",
    "hukuki danışmanlık",
    "hukuki danismanlik",
    "sözleşme hukuku",
    "sozlesme hukuku",
  ],

  translation: [
    "translator",
    "çevirmen",
    "cevirmen",
    "tercüman",
    "tercuman",
    "localization specialist",
    "yerelleştirme uzmanı",
    "yerellestirme uzmani",
  ],

  voice_audio: [
    "voice over",
    "voice actor",
    "seslendirme sanatçısı",
    "seslendirme sanatcisi",
    "sound engineer",
    "ses mühendisi",
    "ses muhendisi",
    "music producer",
    "müzik prodüktörü",
    "muzik produktoru",
    "dublaj sanatçısı",
    "dublaj sanatcisi",
    "sound designer",
    "ses tasarımcısı",
    "ses tasarimcisi",
    "podcast producer",
    "podcast prodüktörü",
    "podcast produktoru",
    "mixing mastering",
    "mix ve mastering",
  ],

  hr_recruitment: [
    "human resources",
    "ik uzmanı",
    "ik uzmani",
    "işe alım uzmanı",
    "ise alim uzmani",
    "recruiter",
    "talent acquisition",
  ],

  sales_business: [
    "sales representative",
    "satış uzmanı",
    "satis uzmani",
    "satış danışmanı",
    "satis danismani",
    "business development",
    "iş geliştirme uzmanı",
    "is gelistirme uzmani",
  ],

  customer_support: [
    "customer support",
    "customer service",
    "müşteri hizmetleri",
    "musteri hizmetleri",
    "teknik destek uzmanı",
    "teknik destek uzmani",
    "technical support",
  ],

  education_training: [
    "trainer",
    "eğitmen",
    "egitmen",
    "kurs hazırlayıcı",
    "kurs hazirlayici",
    "e-learning",
    "eğitim danışmanı",
    "egitim danismani",
    "instructional designer",
  ],
};

/**
 * Merkezi normalizasyona yönlendirir (bkz. lib/utils/normalizeMatchText.ts).
 * Önceki versiyon "â" gibi Unicode aksanlı karakterleri NFD yapmadan
 * doğrudan boşlukla değiştiriyordu — bu, "Hikâye Yazarı" gibi girdilerin
 * role-family tespitinde hiç eşleşmemesine yol açıyordu (bkz. matching
 * audit — "Bir Şehrin Hikâyesi" + Leyla Afet vakası). Merkezi fonksiyon
 * NFD ayrıştırma ile bunu doğru çözer; "/" ayraç davranışı aynı kaldı.
 */
function normalizeText(value: string): string {
  return normalizeMatchText(value);
}

/**
 * Verilen serbest metin içinde hangi role family'lerin sinyali
 * bulunduğunu döndürür (birden fazla olabilir).
 */
export function detectRoleFamilies(
  ...texts: Array<string | null | undefined>
): Set<RoleFamily> {
  const normalized = normalizeText(
    texts
      .filter((value): value is string => typeof value === "string" && value.trim().length > 0)
      .join(" ")
  );

  const families = new Set<RoleFamily>(detectCanonicalRoles(...texts).map(role=>role.family));

  if (!normalized) {
    return families;
  }

  for (const [family, keywords] of Object.entries(ROLE_FAMILY_KEYWORDS) as Array<
    [RoleFamily, string[]]
  >) {
    for (const keyword of keywords) {
      if ((" " + normalized + " ").includes(" " + normalizeText(keyword) + " ")) {
        families.add(family);
        break;
      }
    }
  }

  return families;
}

/**
 * Role family sinyali açısından iki metin uyumlu mu?
 *
 * - İki taraf da tanınan bir aileye sahipse: kesişim şart.
 * - Taraflardan biri tanınmıyorsa uygunluk doğrulanamaz; gate kapalı kalır.
 */
export function isRoleFamilyCompatible(
  roleFamilies: Set<RoleFamily>,
  freelancerFamilies: Set<RoleFamily>
): boolean {
  if (roleFamilies.size === 0 || freelancerFamilies.size === 0) {
    return false;
  }

  for (const family of roleFamilies) {
    if (freelancerFamilies.has(family)) {
      return true;
    }
  }

  return false;
}

export type RoleEligibilityResult = {
  matchScore: number;
  isEligibleForRole: boolean;
  familyCompatible: boolean;
};

/**
 * Deterministic eligibility helper.
 *
 * matchScore: 0-100 arası genel uygunluk (ör. skill/deneyim/rol metni
 * karşılaştırmasından üretilen bir puan — bu fonksiyon puanı KENDİSİ
 * hesaplamaz, dışarıdan alır).
 *
 * isEligibleForRole:
 * - matchScore >= ELIGIBILITY_MATCH_THRESHOLD
 * - VE iki tarafın tanınan role family kümeleri kesişiyor
 */
export function computeRoleEligibility(
  matchScore: number,
  roleText: string | null | undefined,
  freelancerText: string | null | undefined
): RoleEligibilityResult {
  const roleFamilies = detectRoleFamilies(roleText);
  const freelancerFamilies = detectRoleFamilies(freelancerText);

  const familyCompatible = isRoleFamilyCompatible(roleFamilies, freelancerFamilies);

  const isEligibleForRole =
    familyCompatible && matchScore >= ELIGIBILITY_MATCH_THRESHOLD;

  return {
    matchScore: familyCompatible ? matchScore : 0,
    isEligibleForRole,
    familyCompatible,
  };
}

/** Declared occupations take priority; tool tags cannot add unrelated families. */
export function freelancerFamilyText(profile: { title?: string | null; expertise?: string | null; skills?: string[] | null }): string {
 const declared = [profile.title, profile.expertise].filter(Boolean).join(" ");
 return detectRoleFamilies(declared).size > 0 ? declared : (profile.skills ?? []).join(" ");
}

/** Discovery and API consumers select only eligible roles; no positional fallback. */
export function selectBestEligibleRole<T extends { isEligibleForRole: boolean; score: number; relevance?: RoleRelevance }>(matches: readonly T[]): T | null {
 return matches.reduce<T | null>((best, match) =>
  match.isEligibleForRole && (!match.relevance || isDirectRoleRelevance(match.relevance)) && (!best || match.score > best.score) ? match : best, null);
}
