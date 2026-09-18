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
    .replace(/\s+/g, " ");
}

function getWords(value: string) {
  return value
    .split(/[\s,/&+()-]+/)
    .map((word) => word.trim())
    .filter((word) => word.length >= 3);
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

  if (leftWords.length === 0 || rightWords.length === 0) return false;

  return leftWords.some((word) => rightWords.includes(word));
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
