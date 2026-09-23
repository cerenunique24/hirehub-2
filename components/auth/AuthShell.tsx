import { Logo } from "@/components/common/Logo";

/**
 * Login ve Register sayfalarının paylaştığı ortak üst çerçeve.
 *
 * Amaç: her iki ekranda da aynı CollaCrew logosu/wordmark'ı, aynı
 * "ana sayfaya dön" davranışını ve aynı breathing room'u sağlamak — iki
 * sayfa birbirinden kopuk iki farklı tasarım gibi görünmemeli. Sayfaların
 * kendi iç layout'u (login'in iki kolonlu koyu hero paneli, register'ın
 * tek kolonlu kart yapısı gibi) bilerek korunuyor; bu bileşen sadece
 * ortak üst kısmı sağlıyor, mevcut auth/redirect mantığına dokunmuyor.
 */
export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[var(--color-surface-1)]">
      <div className="px-6 pt-6 sm:px-10 sm:pt-8">
        <Logo />
      </div>

      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
