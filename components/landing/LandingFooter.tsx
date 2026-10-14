import Image from "next/image";
import Link from "next/link";

const GROUPS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Platform",
    links: [
      { label: "Nasıl Çalışır", href: "/#how-it-works" },
      { label: "AI Eşleştirme", href: "/#ai-matching" },
      { label: "Freelancerları keşfet", href: "/client/freelancers" },
      { label: "Projeleri keşfet", href: "/freelancers/discover" },
      { label: "Üyelikler", href: "/premium" },
    ],
  },
  {
    title: "Freelancer",
    links: [
      { label: "Ekibe katıl", href: "/register/freelancer" },
      { label: "Profilini oluştur", href: "/register/freelancer" },
      { label: "Projeleri keşfet", href: "/freelancers/discover" },
      { label: "Kazançlar", href: "/freelancers/earnings" },
    ],
  },
  {
    title: "Müşteri",
    links: [
      { label: "Proje oluştur", href: "/client/create-project" },
      { label: "Freelancerları keşfet", href: "/client/freelancers" },
      { label: "Proje yönetimi", href: "/client/projects" },
      { label: "Güvenli çalışma", href: "/#how-it-works" },
    ],
  },
  {
    title: "Destek",
    links: [
      { label: "SSS", href: "/#faq" },
      { label: "Yardım merkezi", href: "/login" },
      { label: "Destek talebi oluştur", href: "/login" },
      { label: "Giriş yap", href: "/login" },
    ],
  },
];

export default function LandingFooter() {
  return (
    <footer className="border-t border-[var(--color-border-subtle)] bg-white">
      <div className="mx-auto max-w-6xl px-6 py-14 sm:px-10">
        <div className="grid gap-12 md:grid-cols-[1.35fr_repeat(4,1fr)]">
          <div className="max-w-xs">
            <Link href="/" className="inline-flex items-center" aria-label="CollaCrew">
              <Image src="/logo.png" alt="CollaCrew" width={126} height={24} />
            </Link>

            <p className="mt-4 text-[13px] leading-5 text-[var(--color-text-secondary)]">
              Projeni AI ile analiz eden, doğru freelancerlarla eşleştiren ve ekibinle tek yerde çalışmanı sağlayan
              iş birliği platformu.
            </p>

            <div className="mt-7 border-t border-[var(--color-border-subtle)] pt-6">
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">Ekibe katıl</p>
              <p className="mt-1.5 text-[12px] leading-5 text-[var(--color-text-secondary)]">
                Yeteneğini projelere dönüştür. Profilini oluştur ve sana uygun işleri keşfet.
              </p>
              <Link
                href="/register/freelancer"
                className="mt-4 inline-flex h-9 items-center justify-center rounded-[6px] bg-[var(--color-text-primary)] px-4 text-[12px] font-medium text-white transition-opacity hover:opacity-90"
              >
                Freelancer olarak katıl
              </Link>
            </div>
          </div>

          {GROUPS.map((group) => (
            <div key={group.title}>
              <p className="text-[13px] font-medium text-[var(--color-text-primary)]">{group.title}</p>
              <ul className="mt-4 space-y-2.5">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-[13px] leading-5 text-[var(--color-text-secondary)] transition-colors hover:text-[var(--color-text-primary)]"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[var(--color-border-subtle)] pt-6 text-xs text-[var(--color-text-muted)] sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} CollaCrew. Tüm hakları saklıdır.</p>
          <div className="flex flex-wrap gap-x-5 gap-y-2">
            <Link href="/#faq" className="transition-colors hover:text-[var(--color-text-primary)]">
              KVKK
            </Link>
            <Link href="/#faq" className="transition-colors hover:text-[var(--color-text-primary)]">
              Gizlilik
            </Link>
            <Link href="/#faq" className="transition-colors hover:text-[var(--color-text-primary)]">
              Kullanım koşulları
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
