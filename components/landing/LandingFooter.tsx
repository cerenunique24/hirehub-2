import Image from "next/image";
import Link from "next/link";

/**
 * Static landing footer. Only links to routes / anchors that actually exist:
 * pages that don't exist yet (Hakkımızda, İletişim, legal pages) are left out
 * rather than pointed at placeholder URLs.
 */
const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Ürün",
    links: [
      { label: "Nasıl Çalışır", href: "/#how-it-works" },
      { label: "AI Eşleştirme", href: "/#ai-matching" },
      { label: "Projeleri Keşfet", href: "/freelancers/discover" },
      { label: "Üyelikler", href: "/premium" },
    ],
  },
  {
    title: "Başla",
    links: [
      { label: "Freelancer olarak katıl", href: "/register/freelancer" },
      { label: "Proje sahibi olarak katıl", href: "/register/client" },
      { label: "Giriş Yap", href: "/login" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "SSS", href: "/#faq" },
      { label: "Destek talebi oluştur", href: "/login" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 sm:px-10">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center" aria-label="CollaCrew">
              <Image src="/logo.png" alt="CollaCrew" width={126} height={24} />
            </Link>
            <p className="mt-4 text-[13px] leading-5 text-[var(--color-text-secondary)]">
              Projeni AI ile analiz eden, doğru freelancerlarla eşleştiren ve ekibinle tek yerde çalışmanı sağlayan
              iş birliği platformu.
            </p>
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

        <div className="mt-12 flex flex-col gap-2 border-t border-[var(--color-border-subtle)] pt-6 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CollaCrew. Tüm hakları saklıdır.</p>
          <p>AI destekli freelance iş birliği platformu</p>
        </div>
      </div>
    </footer>
  );
}
