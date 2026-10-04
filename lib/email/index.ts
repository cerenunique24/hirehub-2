/**
 * E-posta bildirimi mimarisi (sağlayıcı entegrasyonu henüz YOK).
 *
 * Akış: uygulamadaki her marketplace olayı `lib/notifications.ts` içindeki
 * merkezi `notify*()` fonksiyonlarından geçer. Bu fonksiyonlar (1) `notifications`
 * tablosuna uygulama içi bildirimi yazar, (2) aynı olayı burada tanımlı
 * `dispatchNotificationEmail()` ile e-posta katmanına iletir.
 *
 * Şu an `activeProvider` bir no-op'tur: hiçbir e-posta gönderilmez. Gerçek
 * sağlayıcı (SMTP/Resend vb.) eklendiğinde yalnızca `activeProvider`
 * değiştirilir; olayları çağıran hiçbir sayfa/route değişmez. Tarayıcıdan
 * gönderim yapılmaz — sunucu tarafı (route handler / DB webhook) kullanılmalıdır.
 */

export type OutboundEmail = {
  /** Alıcının kullanıcı kimliği. E-posta adresi sunucu tarafında çözülür. */
  userId: string;
  /** Bildirim türü (notifications.type) — şablon seçimi için. */
  type: string;
  subject: string;
  body: string;
  link?: string;
};

export interface EmailProvider {
  readonly name: string;
  send(email: OutboundEmail): Promise<void>;
}

export const noopEmailProvider: EmailProvider = {
  name: "noop",
  async send() {
    // Bilinçli olarak boş: e-posta sağlayıcısı henüz bağlı değil.
  },
};

let activeProvider: EmailProvider = noopEmailProvider;

export function setEmailProvider(provider: EmailProvider) {
  activeProvider = provider;
}

export async function dispatchNotificationEmail(email: OutboundEmail): Promise<void> {
  try {
    await activeProvider.send(email);
  } catch (error) {
    // E-posta ikincil bir yan etkidir; ana akışı asla kesmemeli.
    console.error("[email] Gönderim hatası:", activeProvider.name, error);
  }
}
