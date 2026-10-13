import { normalizeMatchText } from "@/lib/utils/normalizeMatchText";

export type RoleRelevanceLevel = "exact" | "strong_related" | "related" | "adjacent" | "unrelated";
type Family = "marketing" | "writing" | "design" | "development" | "architecture";
type RoleDefinition = { id: string; family: Family; subFamily: string; aliases: readonly string[] };
const definition = (id: string, family: Family, subFamily: string, aliases: string[]): RoleDefinition => ({ id, family, subFamily, aliases });
/** Canonical occupations, not tool/tag overlap. Existing profile fields remain unchanged. */
export const ROLE_TAXONOMY: readonly RoleDefinition[] = [
 definition("digital_marketing","marketing","general",["digital marketing specialist","digital marketing","digital marketer","marketing specialist","dijital pazarlama uzmanı","dijital pazarlama"]),
 definition("performance","marketing","acquisition",["performance marketer","performance marketing","performans pazarlama"]),
 definition("growth","marketing","acquisition",["growth marketer","growth marketing","growth marketing specialist"]),
 definition("social","marketing","social",["social media specialist","social media marketing","social media manager","social media","sosyal medya uzmanı","sosyal medya pazarlama"]),
 definition("seo","marketing","search",["seo specialist","seo","search engine optimization","seo uzmanı"]),
 definition("content_marketing","marketing","content",["content marketer","content marketing","içerik pazarlama"]),
 definition("brand_strategy","marketing","strategy",["brand strategist","brand strategy","marka stratejisti","marka stratejisi"]),
 definition("content_writing","writing","editorial",["content writer","content writing","içerik yazarı","içerik yazarlığı"]),
 definition("copywriting","writing","commercial",["copywriter","copywriting","metin yazarı","metin yazarlığı"]),
 definition("screenwriting","writing","narrative",["screenwriter","screenwriting","senarist","senaryo yazarı"]),
 definition("book_writing","writing","narrative",["book writer","novelist","ghostwriter","kitap yazarı","roman yazarı","hikaye yazarı","edebi metin yazarlığı"]),
 definition("blog","writing","editorial",["blog writer","blog writing","blog yazarı"]),
 definition("ux_writing","writing","product",["ux writer","ux writing","ux yazarı"]),
 definition("technical_writing","writing","technical",["technical writer","technical writing","teknik yazar"]),
 definition("uiux","design","digital_product",["ui ux designer","ui ux design","ui ux","ui designer","ux designer","ui design","ux design","arayüz tasarımı","kullanıcı deneyimi tasarımı"]),
 definition("product_design","design","digital_product",["product designer","product design","ürün tasarımcısı"]),
 definition("web_design","design","digital_product",["web designer","web design","web tasarımcısı","web tasarım"]),
 definition("brand_design","design","brand_visual",["brand designer","brand design","marka tasarımcısı","marka tasarımı"]),
 definition("graphic","design","brand_visual",["graphic designer","graphic design","grafik tasarımcı","grafik tasarımcısı","grafik tasarım","visual designer","visual design","social media design","sosyal medya tasarımı"]),
 definition("motion","design","motion",["motion designer","motion design","motion graphics"]),
 definition("interior","architecture","spatial",["interior designer","interior design","interior architect","iç mimar","iç mimarlık","mekan tasarımı"]),
 definition("architect","architecture","spatial",["architect","architecture","architectural design","mimar","mimari"]),
 definition("backend","development","server",["backend developer","back end developer","backend development","backend"]),
 definition("frontend","development","web_client",["frontend developer","front end developer","frontend development","frontend"]),
 definition("fullstack","development","fullstack",["full stack developer","fullstack developer","full stack","fullstack"]),
 definition("mobile","development","mobile",["mobile developer","mobile development","mobil uygulama geliştirici","ios developer","android developer","react native developer"]),
 definition("devops","development","infrastructure",["devops engineer","devops","devops mühendisi"]),
 definition("data_engineering","development","data",["data engineer","data engineering","veri mühendisi"]),
];
type Relation = { level: RoleRelevanceLevel; roleScore: number; maxScore?: number };
const relations: Record<string, Relation> = {};
function relate(a: string, b: string, level: RoleRelevanceLevel, roleScore: number, maxScore?: number) {
 relations[[a,b].sort().join(":")] = { level, roleScore, maxScore };
}
for (const [a,b] of [
 ["digital_marketing","performance"],["digital_marketing","growth"],["performance","growth"],
 ["digital_marketing","social"],["copywriting","content_writing"],["content_writing","blog"],
 ["uiux","product_design"],["uiux","web_design"],["brand_design","graphic"],
 ["backend","fullstack"],["frontend","fullstack"],["interior","architect"],
]) relate(a,b,"strong_related",80);
for (const [a,b] of [
 ["social","seo"],["digital_marketing","seo"],["digital_marketing","content_marketing"],
 ["content_writing","screenwriting"],["content_writing","book_writing"],["screenwriting","book_writing"],
 ["backend","frontend"],["product_design","web_design"],["graphic","motion"],
]) relate(a,b,"related",55);
for (const [a,b] of [["ux_writing","technical_writing"],["frontend","mobile"]]) relate(a,b,"related",45,49);
for (const [a,b] of [
 ["brand_design","uiux"],["backend","devops"],["backend","data_engineering"],
 ["brand_design","digital_marketing"],
]) relate(a,b,"adjacent",25);

export const ROLE_SCORE_BANDS = {
 exact: { min:85, max:100 },
 strong_related: { min:65, max:84 },
 related: { min:40, max:64 },
 adjacent: { min:1, max:39 },
 unrelated: { min:0, max:0 },
} as const;
export type RoleRelevance = Relation & { family?: Family; subFamily?: string; matchedRole?: string; matchedSubFamily?: string };
function includesPhrase(text: string, phrase: string) {
 return (" "+normalizeMatchText(text)+" ").includes(" "+normalizeMatchText(phrase)+" ");
}
export function detectCanonicalRoles(...texts: Array<string | null | undefined>): RoleDefinition[] {
 const selected = new Set<string>();
 for (const text of texts) {
  if (!text) continue;
  const normalized = " " + normalizeMatchText(text) + " ";
  const hits: { role: RoleDefinition; start: number; end: number }[] = [];
  for (const role of ROLE_TAXONOMY) for (const alias of role.aliases) {
   const phrase = " " + normalizeMatchText(alias) + " ";
   let start = normalized.indexOf(phrase);
   while (start >= 0) {
    hits.push({ role, start, end: start + phrase.length });
    start = normalized.indexOf(phrase, start + 1);
   }
  }
  // A specialized phrase owns its span: "social media design" is visual design,
  // not an additional marketing occupation; "interior architect" is not exact architect.
  for (const hit of hits) if (!hits.some(other =>
   other.start <= hit.start && other.end >= hit.end && other.end - other.start > hit.end - hit.start
  )) selected.add(hit.role.id);
 }
 return ROLE_TAXONOMY.filter(role => selected.has(role.id));
}
function targetRole(requiredRole: string): RoleDefinition | undefined {
 // Longer aliases win, so "Interior Architect" cannot resolve as bare "Architect".
 return [...ROLE_TAXONOMY].sort((a,b)=>
  Math.max(...b.aliases.filter(alias=>includesPhrase(requiredRole,alias)).map(alias=>alias.length),0) -
  Math.max(...a.aliases.filter(alias=>includesPhrase(requiredRole,alias)).map(alias=>alias.length),0)
 ).find(role=>role.aliases.some(alias=>includesPhrase(requiredRole,alias)));
}
export function getRoleRelevance(requiredRole: string, candidateTexts: readonly string[]): RoleRelevance {
 const target=targetRole(requiredRole);
 if(!target) {
  // Retain legacy aliases for occupations outside this audit, in this same source of truth.
  const score=legacyRoleTextScore(requiredRole,[...candidateTexts]);
  return score>=100 ? {level:"exact",roleScore:100} : score>=65 ? {level:"related",roleScore:55} :
   score>0 ? {level:"adjacent",roleScore:25} : {level:"unrelated",roleScore:0};
 }
 let best: RoleRelevance={level:"unrelated",roleScore:0,family:target.family,subFamily:target.subFamily};
 for(const candidate of detectCanonicalRoles(...candidateTexts)) {
  const relation: Relation = candidate.id===target.id ? {level:"exact",roleScore:100} :
   relations[[target.id,candidate.id].sort().join(":")] ??
   (candidate.family===target.family ? {level:"adjacent",roleScore:25} : {level:"unrelated",roleScore:0});
  if(relation.roleScore>best.roleScore) best={...relation,family:target.family,subFamily:target.subFamily,matchedRole:candidate.id,matchedSubFamily:candidate.subFamily};
 }
 return best;
}
export function boundRoleRelevanceScore(score: number, relevance: RoleRelevance): number {
 const max=relevance.maxScore ?? ROLE_SCORE_BANDS[relevance.level].max;
 return Math.max(0,Math.min(max,Math.round(Number.isFinite(score)?score:0)));
}
export function scoreRoleRelevance(relevance: RoleRelevance, skills: number, portfolio: number, experience: number): number {
 if(relevance.level==="unrelated") return 0;
 const band=ROLE_SCORE_BANDS[relevance.level];
 const base=relevance.level==="adjacent" ? 20 : band.min + (relevance.level==="related" && relevance.roleScore>=55 ? 5 : 0);
 const clamp=(value:number)=>Math.max(0,Math.min(100,value));
 // Skill support is at most 8 points; it can never change the relevance level.
 return boundRoleRelevanceScore(base + clamp(skills)*.08 + clamp(portfolio)*.04 + clamp(experience)*.03,relevance);
}
export function isDirectRoleRelevance(relevance: Pick<RoleRelevance,"level">): boolean {
 return relevance.level==="exact" || relevance.level==="strong_related" || relevance.level==="related";
}
export function calculateRoleTextScore(requiredRole: string, candidateTexts: string[]): number {
 return getRoleRelevance(requiredRole,candidateTexts).roleScore;
}
const normalizeText=normalizeMatchText;

function legacyRoleTextScore(
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
    "growth marketer": ["digital marketing", "performance marketing", "content marketing"],
    "performance marketer": ["digital marketing", "growth marketing", "performance marketing"],
    "digital marketing specialist": ["growth marketer", "performance marketer", "social media specialist"],
    "book writer": ["content writer", "screenwriter", "ghostwriter", "kitap yazari"],
    "screenwriter": ["content writer", "book writer", "senarist"],

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
