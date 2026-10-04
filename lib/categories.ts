/**
 * CollaCrew platformunun TEK merkezi kategori kaynağı.
 *
 * ÖNEMLİ KAVRAM AYRIMI (bkz. proje/uzmanlık birleştirme analizi):
 * - Kategori: platformun sabit, kontrollü sınıflandırma listesi. Freelancer
 *   kayıt/profil, proje oluşturma/düzenleme, freelancer keşfet, proje
 *   keşfet ve AI matching HEPSİ bu listeyi kullanmalı.
 * - Skill/Beceri: kullanıcının sahip olduğu teknik/profesyonel beceri
 *   (Figma, React, AutoCAD vb.) — kategoriden bağımsızdır, burada YOK.
 * - "Uzmanlık" ayrı, kontrolsüz büyüyen ikinci bir kategori sistemi
 *   OLMAMALI. Bir arayüzde "Uzmanlık" bir filtre/sınıflandırma olarak
 *   kullanılıyorsa bu listeyi kullanmalı ve kullanıcıya "Kategori" olarak
 *   gösterilmelidir (bkz. app/client/freelancers/page.tsx,
 *   app/freelancers/freelancers/page.tsx).
 *
 * KÖKEN
 * Bu liste, platformda daha önce bağımsız olarak var olan 5 farklı
 * kategori listesinin (freelancer kayıt, proje oluşturma, portfolyo,
 * client kayıt, individual client kayıt) birleşimi/uzlaşmasıdır — yeni
 * bir taksonomi İCAT EDİLMEDİ. Serbest tasarım/yazılım kırılımları
 * (ör. "UI/UX Tasarım", "Web Geliştirme") korundu, proje tarafının sahip
 * olup freelancer tarafında hiç karşılığı olmayan geniş domainler
 * (ör. "Ses & Müzik", "Fotoğraf") eklendi.
 *
 * VERİ GÜVENLİĞİ
 * `profiles.project_types`, `profiles.expertise`, `projects.category`,
 * `portfolio_items.category` kolonlarının HİÇBİRİNDE DB seviyesinde
 * CHECK/enum kısıtlaması yok (bkz. audit) — bu yüzden burada da mevcut
 * satırları bozacak bir migration/backfill YAPILMADI. Eski kayıtlarda
 * bu listedeki tam yazımla eşleşmeyen değerler (ör. "Yazılım",
 * "Yazılım & Teknoloji") olabilir — bunlar `normalizeCategory()` ile
 * bu listedeki canonical karşılığına çözümlenir, satırın kendisi asla
 * değiştirilmez.
 */

export const CATEGORIES: string[] = [
  "UI/UX Tasarım",
  "Web Tasarım",
  "Grafik Tasarım",
  "Marka Tasarımı",
  "Ürün Tasarımı",
  "3D Tasarım",
  "Mimari & İç Mekân",
  "Web Geliştirme",
  "Mobil Uygulama",
  "Yazılım Geliştirme",
  "E-Ticaret",
  "Dijital Pazarlama",
  "İçerik & Çeviri",
  "Video & Animasyon",
  "Ses & Müzik",
  "Fotoğraf",
  "İş & Yönetim",
  "Senaryo & Hikâye",
  "Diğer",
];

/**
 * Eski/farklı sayfalarda kullanılmış, canonical listedeki tam yazımla
 * eşleşmeyen ama aynı kategoriyi kastettiği açık olan geçmiş değerler.
 * SADECE karşılaştırma/normalize için kullanılır — hiçbir DB satırı bu
 * eşleme yüzünden yeniden yazılmaz.
 */
const LEGACY_CATEGORY_ALIASES: Record<string, string> = {
  "yazılım": "Yazılım Geliştirme",
  "yazılım & teknoloji": "Yazılım Geliştirme",
  "içerik üretimi": "İçerik & Çeviri",
  "içerik": "İçerik & Çeviri",
  "pazarlama": "Dijital Pazarlama",
};

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

const CATEGORY_LOOKUP = new Map<string, string>(
  CATEGORIES.map((category) => [normalizeKey(category), category])
);

/**
 * Serbest metin / eski bir kategori değerini canonical listedeki
 * karşılığına çözer. Tanınmıyorsa (AI'nın uydurduğu bir metin, ya da
 * gerçekten yeni bir değer) trim'lenmiş orijinal metni aynen döner —
 * veri sessizce kaybolmaz, sadece bilinen bir kategoriyle eşleşmiyor
 * olarak işaretlenmiş olur (bkz. isKnownCategory).
 */
export function normalizeCategory(
  value: string | null | undefined
): string | null {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const key = normalizeKey(trimmed);

  return (
    CATEGORY_LOOKUP.get(key) ??
    LEGACY_CATEGORY_ALIASES[key] ??
    trimmed
  );
}

/** Değer, canonical listedeki (alias çözümü sonrası) gerçek bir kategori mi? */
export function isKnownCategory(value: string | null | undefined): boolean {
  const normalized = normalizeCategory(value);
  if (!normalized) return false;
  return CATEGORIES.includes(normalized);
}
