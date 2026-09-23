/**
 * `profiles.expertise` gerçek Supabase kolonunda tek bir `text` alanı
 * (skills/languages/work_types gibi gerçek Postgres array değil).
 * Buna rağmen UI çok-seçimli bir liste olarak davranıyor, bu yüzden
 * bazı satırlarda değer:
 *
 * - gerçek bir dizi (["UI Design", "Branding"])
 * - JSON'a çevrilmiş bir dizi metni ('["UI Design","Branding"]')
 * - BOZUK veri: bir string'in karakterlere bölünüp array'e çevrilmesi
 *   (["U","I"," ","D","e","s","i","g","n"]) — muhtemelen bir array
 *   bekleyen kod bir string'e spread/Array.from uyguladığında oluşur
 * - düz virgüllü metin ("UI Design, Branding")
 * - tek bir string ("UI Design")
 * - null / undefined
 * - beklenmeyen bir obje
 *
 * olabilir. `normalizeStringArray` bunların hepsini güvenli şekilde
 * temiz bir `string[]`'e çevirir — hiçbir zaman throw etmez.
 */
export function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    // Bozuk "karakter dizisi" durumunu tespit et: elemanların çoğu
    // tek karakter ise (bir string'in yanlışlıkla karakterlere
    // bölünmesi), orijinal metni geri kurup virgülle ayır.
    const singleCharCount = value.filter(
      (item) => typeof item === "string" && item.length <= 1
    ).length;

    if (value.length > 3 && singleCharCount / value.length > 0.6) {
      return splitDelimited(
        value.filter((item): item is string => typeof item === "string").join("")
      );
    }

    return value
      .filter((item): item is string => typeof item === "string")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return [];
    }

    if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const parsed = JSON.parse(trimmed);
        return normalizeStringArray(parsed);
      } catch {
        // Geçerli JSON değil — düz metin olarak devam et.
      }
    }

    return splitDelimited(trimmed);
  }

  if (value && typeof value === "object") {
    return normalizeStringArray(Object.values(value as Record<string, unknown>));
  }

  return [];
}

function splitDelimited(value: string): string[] {
  return value
    .split(/[,;\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

/**
 * `normalizeStringArray` çıktısını, gerçek DB kolonu `text` olan
 * alanlar için (ör. `profiles.expertise`) Supabase'e yazılacak
 * formata çevirir — bir JS array'i asla doğrudan bir `text` kolonuna
 * göndermeyiz (bu, karakter-bölünmesi bozulmasının kök nedeniydi).
 */
export function stringArrayToTextColumn(values: string[]): string | null {
  const cleaned = values.map((v) => v.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned.join(", ") : null;
}
