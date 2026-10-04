/**
 * Marketplace operasyonları (uyuşmazlık, şikayet, iptal, süre uzatma,
 * değerlendirme) için ortak Türkçe etiketler. Hem kullanıcı arayüzü hem admin
 * paneli aynı kaynağı kullanır.
 */

export const DISPUTE_REASON_LABEL: Record<string, string> = {
  non_delivery: "Teslim yapılmadı",
  quality: "Teslim kalitesi",
  deadline: "Teslim süresi / gecikme",
  payment: "Ödeme sorunu",
  communication: "İletişim sorunu",
  off_platform: "Platform dışı iletişim / ödeme",
  other: "Diğer",
};

export const DISPUTE_STATUS_LABEL: Record<string, string> = {
  open: "Açık",
  under_review: "İnceleniyor",
  resolved: "Çözüldü",
  closed: "Kapatıldı",
};

export const DISPUTE_OUTCOME_LABEL: Record<string, string> = {
  client_favored: "Client lehine",
  freelancer_favored: "Freelancer lehine",
  split: "Karşılıklı uzlaşma",
  withdrawn: "Talep geri çekildi",
  no_action: "İşlem gerekmedi",
};

export const REPORT_REASON_LABEL: Record<string, string> = {
  spam: "Spam / istenmeyen içerik",
  harassment: "Taciz veya uygunsuz davranış",
  off_platform_contact: "Platform dışı iletişim / ödeme talebi",
  fraud: "Dolandırıcılık şüphesi",
  inappropriate: "Uygunsuz içerik",
  other: "Diğer",
};

export const REPORT_STATUS_LABEL: Record<string, string> = {
  new: "Yeni",
  reviewing: "İnceleniyor",
  actioned: "İşlem yapıldı",
  dismissed: "Reddedildi",
};

export const REPORT_TARGET_LABEL: Record<string, string> = {
  user: "Kullanıcı",
  project: "Proje",
  message: "Mesaj",
  review: "Değerlendirme",
};

export const REQUEST_STATUS_LABEL: Record<string, string> = {
  pending: "Yanıt bekliyor",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
};

export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  pending: "Beklemede",
  shortlisted: "Kısa listede",
  accepted: "Kabul edildi",
  rejected: "Reddedildi",
  withdrawn: "Geri çekildi",
  expired: "Süresi doldu",
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  open: "Açık",
  ready_to_start: "Başlamaya hazır",
  in_progress: "Devam ediyor",
  completed: "Tamamlandı",
  cancelled: "İptal edildi",
};
