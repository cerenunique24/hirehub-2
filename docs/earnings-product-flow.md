# Kazançlar ve para çekme ürün akışı

## Mevcut ürün

Kazançlar ekranı cüzdan değildir. Proje üyeliği/anlaşma tutarı, teklif fallback’i ve freelancer’a ait milestone kayıtları okunur. Aşama onayı, ödeme tahsilatı ve banka aktarımı ayrı olaylardır.

- `project_milestones.payment_status`: ödeme state machine kaydı.
- `freelancer_payout_amount`: freelancer net hakediş snapshot’ı; banka transferi kanıtı değildir.
- `platform_fee_amount`: client’ın ek hizmet bedeli; freelancer netinden yeniden düşülmez.
- `approved_at`: aylık onaylanan hakediş hesabının tarihi. Eksik tarih/tutar varsa kesin toplam gösterilmez.
- `payment_events`: provider event/idempotency için şema mevcut; bağlı provider, event veya transfer akışı henüz yok.
- Withdrawal, banka hesabı saklama, invoice ve bağımsız wallet ledger yapıları mevcut değil.

Bu nedenle Para Çek aksiyonu disabled. Kullanılabilir bakiye, onaylanan hakedişten veya `held` / `payout_pending` toplamından türetilmez. Banka bilgisi toplayan form ve başarılı talep simülasyonu yoktur. Kazanç hareketleri ile para çekme geçmişi ayrı alanlardır.

## Altyapı bağlandığında kullanılacak akış — henüz uygulanmadı

1. **Çekilebilir bakiye:** Provider ve uygulama ledger’ının mutabık olduğu bakiye sunulur. Başlatılmış/bekleyen transferler ikinci kez kullanılmaz; iade ve uyuşmazlık tutarları gerçek kurallara göre ayrılır.
2. **Tutar:** Kullanıcı tutarı seçer. Minimum/maksimum sadece onaylı ürün/provider kuralı varsa gösterilir. Sunucu bakiye ve limitleri yeniden doğrular.
3. **Ödeme hesabı:** Güvenli şekilde persist edilmiş ve gerektiğinde doğrulanmış ödeme hesabı seçilir. Hesap sahibi, maskeli IBAN ve varsa banka gösterilir. Browser storage’da banka bilgisi tutulmaz.
4. **Aktarım özeti:** Kesinti ve net tutar yalnızca gerçek fee/withholding kurallarıyla hesaplanır. Client komisyonu freelancer’dan tekrar alınmaz. Eksik kural varsa kesin net aktarım tutarı uydurulmaz.
5. **Onay:** Tutar, hedef hesap ve gerçek ücretler tekrar sunulur. Backend idempotency key, atomik bakiye rezervasyonu ve çift-submit koruması sağlar; UI submit sırasında loading/disabled olur.
6. **Talep ve takip:** Yalnızca backend kalıcı talep oluşturduktan sonra “Para çekme talebin alındı” gösterilir. Talep aynı anda geçmişte görünür. Provider cevabı/webhook ile gerçek bekleyen, hazırlanıyor, aktarıldı veya başarısız durumları güncellenir.

Talep oluşturmak, para göndermek ve provider tarafından transferin tamamlandığını doğrulamak üç farklı olaydır. Admin manuel olarak gerçek dışı “aktarıldı” kaydı üretemez. Admin liste/inceleme kontrolleri ancak gerçek withdrawal records ve yetki politikaları hazır olduğunda eklenir. Bildirimler mevcut notification altyapısını kullanır; provider state değişiklikleri dedupe edilmeden bildirim üretilmez.

## Eksik backend ve ürün kararları

- Payment collection ve payout provider seçimi/entegrasyonu.
- Çekilebilir bakiye ledger’ı, mutabakat, para birimi ve ödeme bekletme kuralları.
- Withdrawal persistence, state machine, idempotency, atomik rezervasyon ve erişim politikaları.
- Banka hesabının güvenli saklanması/doğrulanması ve maskeli gösterimi.
- Minimum withdrawal, provider/platform fee, vergi/withholding varsa kuralları.
- Başarısız payout, iade/uyuşmazlık ve yeniden deneme politikası.
- Admin payout operasyonları, audit trail ve mevcut notification sistemine bağlanma.

Bu tasarım notu bir ödeme entegrasyonu veya yeni database sistemi oluşturmaz.
