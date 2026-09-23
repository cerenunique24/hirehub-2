import Image from "next/image";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/Button";

/**
 * Static landing footer. Only links to routes / anchors that actually exist:
 * pages that don't exist yet (Hakkımızda, İletişim, legal pages) are left out
 * rather than pointed at placeholder URLs.
 */
const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Nasıl Çalışır", href: "/#how-it-works" },
      { label: "AI Eşleştirme", href: "/#ai-matching" },
      { label: "Freelancerları Keşfet", href: "/client/freelancers" },
      { label: "Projeleri Keşfet", href: "/freelancers/discover" },
      { label: "Üyelikler", href: "/premium" },
    ],
  },
  {
    title: "Freelancer",
    links: [
      { label: "Freelancer Ol", href: "/register/freelancer" },
      { label: "Profilini Oluştur", href: "/register/freelancer/setup" },
      { label: "Projeleri Keşfet", href: "/freelancers/discover" },
      { label: "Kazançlar", href: "/freelancers/earnings" },
    ],
  },
  {
    title: "Müşteri",
    links: [
      { label: "Proje Oluştur", href: "/client/create-project" },
      { label: "Freelancerları Keşfet", href: "/client/freelancers" },
      { label: "Proje Yönetimi", href: "/client/projects" },
      // "Güvenli Çalışma" → client tarafında bütçe/hakediş takibinin yapıldığı gerçek route.
      { label: "Güvenli Çalışma", href: "/client/payments" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "SSS", href: "/#faq" },
      // Rol bazlı iki yardım merkezi var (/client/help, /freelancers/help); proxy.ts
      // rol ayrımı yapmadan sadece oturum kontrolü yaptığından herhangi bir
      // kullanıcı bu route'a girebilir — footer için tek, gerçek bir hedef seçildi.
      { label: "Yardım Merkezi", href: "/freelancers/help" },
      // Destek talebi oluşturma formu ayrı bir route değil, aynı yardım sayfasının içinde.
      { label: "Destek Talebi Oluştur", href: "/freelancers/help" },
      { label: "Giriş Yap", href: "/login" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10 sm:py-16">
        <div className="grid grid-cols-2 gap-x-8 gap-y-10 md:grid-cols-[1.4fr_repeat(4,1fr)] md:gap-10">
          <div className="col-span-2 max-w-sm md:col-span-1">
            <Link href="/" className="inline-flex items-center" aria-label="CollaCrew">
              <Image src="/logo.png" alt="CollaCrew" width={126} height={24} />
            </Link>
            <p className="mt-4 text-[13px] leading-5 text-[var(--color-text-secondary)]">
              Projeni AI ile analiz eden, doğru freelancerlarla eşleştiren ve ekibinle tek yerde çalışmanı sağlayan
              iş birliği platformu.
            </p>

            <div className="mt-8">
              {/* "Ekibe Katıl" burada CollaCrew'un kendi şirket/ürün ekibine
                  katılmayı ifade eder — freelancer kaydı değil (bkz. /careers). */}
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Ekibe Katıl</p>
              <p className="mt-1.5 text-[13px] leading-5 text-[var(--color-text-secondary)]">
                CollaCrew ekibinde yer almak ister misin? Açık pozisyonlarımızı incele veya yeteneklerini bize
                gönder.
              </p>
              <Link href="/careers" className={buttonClasses({ variant: "primary", size: "sm", className: "mt-4" })}>
                Ekibe Katıl
              </Link>
            </div>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{group.title}</p>
              <ul className="mt-3 space-y-2">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col gap-3 border-t border-[var(--color-border-subtle)] pt-6 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CollaCrew. Tüm hakları saklıdır.</p>

          {/* TODO: KVKK, Gizlilik ve Kullanım Koşulları sayfaları henüz oluşturulmadı.
              Gerçek sayfalar hazır olduğunda bu linkler ilgili route'lara bağlanmalı. */}
          <ul className="flex items-center gap-5">
            <li>
              <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
                KVKK
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
                Gizlilik
              </a>
            </li>
            <li>
              <a href="#" className="transition-colors hover:text-[var(--color-text-primary)]">
                Kullanım Koşulları
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
