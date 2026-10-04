export type SkillMatch = {
  matchingSkills: string[];
  percentage: number;
};

function normalize(skill: string) {
  return skill
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    // "/" ve genel noktalama işaretleri ayraç sayılır — "UI/UX" ile
    // "UI UX" aynı normalize sonucu vermeli (bkz. matching audit).
    .replace(/[/\\,;:!?.()[\]{}"'_+&|-]+/g, " ")
    .replace(/\s+/g, " ");
}

const STOP_WORDS = new Set(["ve", "ile", "de", "da", "of", "and", "the", "for"]);

/**
 * Words that describe a *kind* of work rather than a specific skill. Sharing
 * only one of these is not a match: "Interior Design" is not "Graphic Design",
 * "Frontend Developer" is not "Backend Developer".
 */
const GENERIC_WORDS = new Set([
  "design",
  "designer",
  "tasarim",
  "tasarimi",
  "tasarimci",
  "development",
  "developer",
  "gelistirme",
  "engineering",
  "engineer",
  "management",
  "yonetimi",
  "uzmani",
  "specialist",
  // "Content Strategy" bir "Content Writing" değil — ikisi de "content"
  // paylaşıyor ama farklı işler (bkz. matching audit negatif testi).
  "content",
  "icerik",
]);

function getWords(value: string) {
  return value
    .split(/[\s,/&+()-]+/)
    .map((word) => word.trim())
    // 2-letter tokens like "ui", "ux", "3d", "ai" are meaningful skills.
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word));
}

/**
 * Kontrollü skill-alias grupları. Bunlar substring/kelime örtüşmesiyle
 * YAKALANAMAYAN ama gerçekten aynı/çok yakın beceriyi ifade eden
 * çiftler içindir — en yaygın olarak TR/EN çeviri karşılıkları (ör.
 * "Hikaye Anlatımı" ile "Screenwriting" hiçbir ortak kelime paylaşmaz,
 * ama ikisi de anlatı kurma becerisidir — bkz. matching audit, "Bir
 * Şehrin Hikâyesi" + Leyla Afet vakası).
 *
 * Bu, mevcut exact/substring/word-overlap davranışını DEĞİŞTİRMEZ —
 * sadece isSameSkill() üçü de başarısız olduğunda kontrol edilen,
 * açıkça listelenmiş, dar kapsamlı bir dördüncü yol ekler. Genel bir
 * "geniş fuzzy eşleşme" DEĞİLDİR; kontrol SUBSTRING bazlıdır (bileşik
 * Türkçe ifadeler içindeki tek bir üyeyi de yakalar, ör. "Türkçe Dil
 * Bilgisi ve Editörlük" ⊃ "editörlük"), ama sadece burada sayılan grup
 * üyeleri birbiriyle eşleşir — rastgele/genel fuzzy matching yok.
 */
const SKILL_ALIAS_GROUPS: string[][] = [
  // Yaratıcı/anlatı yazarlığı — TR + EN.
  [
    "hikaye anlatimi",
    "hikaye yazarligi",
    "senaryo yazimi",
    "yaratici yazarlik",
    "metin yazarligi",
    "creative writing",
    "screenwriting",
    "script writing",
  ],
  // Story Development ↔ Hikâye Geliştirme
  ["hikaye gelistirme", "story development"],
  // Editing ↔ Editörlük
  ["editorluk", "editing"],
  // Content Writing ↔ İçerik Yazarlığı
  ["icerik yazarligi", "content writing"],
  // Copywriting ↔ Metin Yazarlığı
  ["metin yazarligi", "copywriting"],
  // Translation ↔ Çeviri
  ["ceviri", "translation"],
  // Localization ↔ Yerelleştirme / Lokalizasyon
  ["lokalizasyon", "localization", "yerellestirme"],
  // Content Strategy ↔ İçerik Stratejisi
  ["icerik stratejisi", "content strategy"],
];

/**
 * İki normalize edilmiş metin, aynı grubun birer üyesini SUBSTRING
 * olarak içeriyorsa true döner. Simetriktir — hangi tarafın "left"
 * hangisinin "right" olduğu sonucu değiştirmez.
 */
function hasSkillAliasMatch(left: string, right: string): boolean {
  return SKILL_ALIAS_GROUPS.some((group) => {
    const leftHit = group.some((member) => left.includes(member));
    const rightHit = group.some((member) => right.includes(member));
    return leftHit && rightHit;
  });
}

/**
 * İki skill string'inin aynı şeyi kastedip kastetmediğini kontrol eder.
 * Tam eşleşme, birbirini içerme ("Adobe Photoshop" ⊃ "Photoshop") veya
 * anlamlı kelime örtüşmesi ("UI Design" ~ "UI/UX Design") olarak sayılır.
 */
function isSameSkill(a: string, b: string) {
  const left = normalize(a);
  const right = normalize(b);

  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;

  const leftWords = getWords(left);
  const rightWords = getWords(right);

  if (
    leftWords.length > 0 &&
    rightWords.length > 0 &&
    leftWords.some((word) => !GENERIC_WORDS.has(word) && rightWords.includes(word))
  ) {
    return true;
  }

  return hasSkillAliasMatch(left, right);
}

/**
 * Matches are based on the project requirements, not a generated score.
 *
 * Fuzzy karşılaştırma kullanır: yalnızca birebir string eşitliği değil,
 * içerme ve kelime örtüşmesi de eşleşme sayılır ("Grafik Tasarım" ~
 * "Graphic Design", "Adobe Photoshop" ~ "Photoshop").
 */
export function matchSkills(
  projectSkills: string[] | null | undefined,
  candidateSkills: string[] | null | undefined
): SkillMatch {
  const required = projectSkills ?? [];
  const candidates = candidateSkills ?? [];

  const matchingSkills = required.filter((skill) =>
    candidates.some((candidate) => isSameSkill(skill, candidate))
  );

  return {
    matchingSkills,
    percentage:
      required.length === 0
        ? 0
        : Math.round((matchingSkills.length / required.length) * 100),
  };
}

export function uniqueSkills(skills: Array<string[] | null | undefined>) {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const group of skills) {
    for (const skill of group ?? []) {
      const key = normalize(skill);
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(skill);
      }
    }
  }
  return result;
}
