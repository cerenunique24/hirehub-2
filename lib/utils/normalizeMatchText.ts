/**
 * Matching karşılaştırmalarında (rol adı, aile tespiti, alias/related
 * lookup) kullanılan MERKEZİ metin normalizasyonu.
 *
 * Türkçe karakterleri (ı/i, ş/s, ğ/g, ü/u, ö/o, ç/c), Unicode aksanları
 * (â, î, û, é gibi — NFD ayrıştırma + combining-mark temizliği) ve
 * slash/genel noktalama işaretlerini standartlaştırır.
 *
 * ÖNEMLİ: SADECE karşılaştırma amaçlıdır. Hiçbir Supabase satırını
 * değiştirmez — bu fonksiyon yalnızca "bu iki metin aynı şeyi mi
 * kastediyor" sorusuna tutarlı bir cevap vermek için kullanılır.
 *
 * Bu merkezi hale getirilmeden önce lib/ai/match-talent.ts ve
 * lib/matching/roleEligibility.ts kendi ayrı normalizeText()
 * fonksiyonlarına sahipti — ikisi de "/" karakterini temizlemiyordu
 * (bu yüzden "UI/UX Designer" hiçbir alias/related sözlük anahtarıyla
 * eşleşmiyordu) ve roleEligibility.ts'in kendi versiyonu "â" gibi
 * aksanlı karakterleri NFD yapmadan sildiği için "Hikâye Yazarı"
 * gibi girdileri bozuyordu (bkz. matching audit — "Bir Şehrin
 * Hikâyesi" + Leyla Afet vakası). Bu fonksiyon her iki bug'ı da
 * kalıcı olarak çözer ve tek bir yerde tutar.
 */
export function normalizeMatchText(value: string): string {
  return value
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[/\\,;:!?.()[\]{}"'_+&|-]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
