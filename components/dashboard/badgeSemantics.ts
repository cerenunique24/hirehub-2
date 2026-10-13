export type PanelTone = "neutral" | "info" | "success" | "warning" | "revision" | "danger";
/** Status meaning is independent of the viewer/action owner. Unknown labels stay neutral. */
export const PANEL_BADGE_SEMANTICS: Readonly<Record<string, PanelTone>> = {
  "Bekleyen": "warning", "Kısa Listede": "info", "Kabul Edildi": "success",
  "Reddedildi": "danger", "Geri Çekildi": "neutral", "İptal Edildi": "danger", "Süresi Doldu": "neutral",
  "Aktif": "info", "Çalışma devam ediyor": "info", "Freelancer çalışıyor": "info",
  "Ekip hazır · Başlamadı": "warning", "Bekliyor": "warning", "İnceleme bekleniyor": "warning",
  "İncelemede": "warning", "Teslim müşteri incelemesinde": "warning", "Müşteri kararında": "warning",
  "Ekip kuruluyor": "warning", "Freelancer bekleniyor": "warning", "Duraklatıldı": "warning",
  "Tamamlandı": "success", "Onaylandı": "success", "Tüm aşamalar onaylandı": "success",
  "Gecikti": "danger", "Süre aşıldı": "danger", "İptal edildi": "danger",
  "Revizyon": "revision", "Revizyon bekliyor": "revision", "Teslim yaklaşıyor": "warning",
  "Planlandı": "neutral", "Taslak": "neutral", "Tanımsız": "neutral",
};
export function panelBadgeTone(label: string, fallback: PanelTone = "neutral"): PanelTone {
  return PANEL_BADGE_SEMANTICS[label.trim()] ?? fallback;
}
