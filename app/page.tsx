import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  FolderKanban,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import LandingNav from "@/components/landing/LandingNav";
import HeroMatching from "@/components/landing/HeroMatching";
import ProjectFlow from "@/components/landing/ProjectFlow";
import FreelancerDiscovery from "@/components/landing/FreelancerDiscovery";
import WorkspacePanel from "@/components/landing/WorkspacePanel";
import MembershipPlans from "@/components/landing/MembershipPlans";
import LandingFooter from "@/components/landing/LandingFooter";
import { Reveal } from "@/components/landing/Reveal";

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

const VALUE_PILLARS = [
  { icon: Sparkles, label: "AI ile doğru freelancer" },
  { icon: FolderKanban, label: "Dakikalar içinde proje" },
  { icon: Users, label: "Rol bazlı ekip kurma" },
  { icon: ShieldCheck, label: "Güvenli, şeffaf çalışma" },
];

const AI_ROLES = [
  { role: "UI/UX Designer", skills: ["Figma", "Mobil tasarım", "Prototip"], focus: "Arayüz akışları ve tasarım sistemi" },
  { role: "Frontend Developer", skills: ["Next.js", "TypeScript"], focus: "Mobil uyumlu mağaza arayüzü" },
  { role: "Backend Developer", skills: ["Node.js", "Ödeme API"], focus: "Sipariş ve ödeme entegrasyonu" },
];

const DISCOVERY_FEATURES = [
  {
    icon: Search,
    title: "Rol bazlı eşleşme",
    description: "Her rol; beceri, deneyim ve profil verisine göre en uygun freelancerlarla eşleşir.",
  },
  {
    icon: Wallet,
    title: "Şeffaf bütçe ve süre",
    description: "Freelancer, sadece eşleştiği rolün bütçesini ve süresini görür — karışıklık olmaz.",
  },
  {
    icon: Users,
    title: "Ekip olarak çalışın",
    description: "Birden fazla role ihtiyaç duyan projelerde tam bir ekip oluşturun.",
  },
];

const TRUST_POINTS = [
  "E-posta doğrulaması ve KVKK onayı ile oluşturulan hesaplar",
  "Freelancer yalnızca kendi rolünün bütçe ve süresini görür",
  "Aşama bazlı ilerleme: onaylanan ve bekleyen hakediş tek yerde",
  "Mesajlar, dosyalar ve teklifler proje çalışma alanında",
];

const FAQ = [
  {
    q: "CollaCrew ücretsiz mi?",
    a: "Evet. Free planda temel AI proje analizi ve temel eşleşme her zaman ücretsizdir. Daha gelişmiş AI özellikleri Plus ve Pro planlarla açılır.",
  },
  {
    q: "AI eşleştirme nasıl çalışır?",
    a: "Proje açıklamanı analiz eden CollaCrew AI, gerekli rolleri ve becerileri çıkarır; ardından her rolü beceri, deneyim ve profil verisine göre uygun freelancerlarla eşleştirir.",
  },
  {
    q: "Freelancer olarak projede neyi görürüm?",
    a: "Yalnızca eşleştiğin rolün bütçesini ve süresini görürsün. Böylece teklif verirken neyle ilgilendiğin her zaman nettir.",
  },
  {
    q: "Birden fazla freelancerla ekip kurabilir miyim?",
    a: "Evet. Birden fazla role ihtiyaç duyan projelerde her rol için ayrı eşleşme yapılır ve ekip tek bir proje çalışma alanında birlikte çalışır.",
  },
  {
    q: "Proje bütçesini nasıl takip ederim?",
    a: "Proje aşamaları üzerinden toplam bütçeyi, onaylanan ve bekleyen hakedişi tek ekranda görürsün.",
  },
];

/* -------------------------------------------------------------------------- */
/* Page                                                                        */
/* -------------------------------------------------------------------------- */

export default function Home() {
  return (
    <div className="bg-white text-[var(--color-text-primary)]">
      <LandingNav />

      <main>
        {/* HERO ------------------------------------------------------------ */}
        <section className="relative overflow-hidden">
          <div aria-hidden className="cc-grid-bg pointer-events-none absolute inset-0" />

          <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-16 sm:px-10 sm:pt-24 lg:pb-24">
            <div className="max-w-3xl">
              <span
                className="cc-enter inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] border border-[var(--color-border-subtle)] bg-white px-2.5 py-1 text-xs font-medium text-[var(--color-text-secondary)]"
                style={{ "--enter-delay": "0ms" } as React.CSSProperties}
              >
                <Sparkles size={12} className="text-[var(--color-primary-600)]" />
                AI-native freelance iş birliği
              </span>

              <h1
                className="cc-enter mt-5 text-[40px] font-semibold leading-[1.05] tracking-[-0.035em] text-[var(--color-text-primary)] sm:text-[56px] lg:text-[64px]"
                style={{ "--enter-delay": "80ms" } as React.CSSProperties}
              >
                Projeni anlat.
                <br />
                <span className="text-[var(--color-primary-600)]">Ekibini AI kursun.</span>
              </h1>

              <p
                className="cc-enter mt-5 max-w-xl text-[17px] leading-7 text-[var(--color-text-secondary)]"
                style={{ "--enter-delay": "160ms" } as React.CSSProperties}
              >
                CollaCrew projeni analiz eder, gereken rolleri çıkarır ve seni doğru freelancerlarla tek bir çalışma
                alanında buluşturur.
              </p>

              <div
                className="cc-enter mt-8 flex flex-wrap items-center gap-2"
                style={{ "--enter-delay": "240ms" } as React.CSSProperties}
              >
                <Link href="/register" className={buttonClasses({ variant: "primary", size: "lg" })}>
                  Ücretsiz Başla
                  <ArrowRight size={16} />
                </Link>
                <a href="#how-it-works" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                  Nasıl Çalışır?
                </a>
              </div>

              <ul
                className="cc-enter mt-10 grid grid-cols-2 gap-x-6 gap-y-3 sm:flex sm:flex-wrap"
                style={{ "--enter-delay": "320ms" } as React.CSSProperties}
              >
                {VALUE_PILLARS.map(({ icon: Icon, label }) => (
                  <li key={label} className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
                    <Icon size={14} className="shrink-0 text-[var(--color-primary-600)]" />
                    {label}
                  </li>
                ))}
              </ul>
            </div>

            <div className="cc-enter mt-14 lg:mt-16" style={{ "--enter-delay": "420ms" } as React.CSSProperties}>
              <HeroMatching />
            </div>
          </div>
        </section>

        {/* AI MATCHING / ANALYSIS ------------------------------------------ */}
        <section id="ai-matching" className="scroll-mt-14 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40">
          <span id="ai-analysis" className="sr-only" aria-hidden />
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:py-28">
            <div>
              <SectionEyebrow>AI proje analizi</SectionEyebrow>
              <SectionTitle>Yazdığın brief, hazır bir ekip planına dönüşür.</SectionTitle>
              <SectionLead>
                Projeni yazdığın anda CollaCrew AI; gerekli rolleri, her rolün sorumluluklarını ve becerilerini
                otomatik olarak çıkarır — ekip kurmaya hazır, net bir yol haritası sunar.
              </SectionLead>

              <ul className="mt-8 space-y-3">
                {["Gerekli rollerin otomatik tespiti", "Rol başına beceri analizi", "Bütçe ve süre için netlik"].map(
                  (item) => (
                    <li key={item} className="flex items-center gap-2.5 text-sm text-[var(--color-text-secondary)]">
                      <Check size={15} className="shrink-0 text-[var(--color-primary-600)]" />
                      {item}
                    </li>
                  )
                )}
              </ul>
            </div>

            <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-white p-4 shadow-[var(--shadow-md)] sm:p-5">
              <div className="rounded-[var(--radius-md)] border border-dashed border-[var(--color-border-strong)] bg-[var(--color-canvas)] p-3.5 text-sm leading-[22px] text-[var(--color-text-secondary)]">
                &quot;Bir e-ticaret sitesi için mobil uyumlu bir arayüz ve ödeme entegrasyonuna ihtiyacım var.&quot;
              </div>

              <div className="my-4 flex items-center gap-2 text-xs font-medium text-[var(--color-primary-700)]">
                <Sparkles size={13} />
                AI analizi · 3 rol önerildi
              </div>

              <ul className="space-y-2">
                {AI_ROLES.map((item, index) => (
                  <Reveal
                    key={item.role}
                    as="li"
                    variant="up"
                    delay={index * 120}
                    className="rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] px-3.5 py-3"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-medium text-[var(--color-text-primary)]">{item.role}</span>
                      <span className="text-xs text-[var(--color-text-muted)]">Önerilen rol</span>
                    </div>
                    <p className="mt-1 text-[13px] leading-5 text-[var(--color-text-secondary)]">{item.focus}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1">
                      {item.skills.map((skill) => (
                        <span
                          key={skill}
                          className="rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)]"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </Reveal>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS ---------------------------------------------------- */}
        <section id="how-it-works" className="scroll-mt-14 border-t border-[var(--color-border-subtle)]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-28">
            <div className="max-w-2xl">
              <SectionEyebrow>Nasıl çalışır</SectionEyebrow>
              <SectionTitle>Briften ödemeye, tek bir akış.</SectionTitle>
              <SectionLead>
                Projeni oluştur, AI analiz etsin, doğru yeteneklerle eşleş — teklif, çalışma ve hakediş aynı yerde
                ilerlesin.
              </SectionLead>
            </div>

            <div className="mt-12 lg:mt-4">
              <ProjectFlow />
            </div>
          </div>
        </section>

        {/* FREELANCER DISCOVERY -------------------------------------------- */}
        <section className="overflow-hidden border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-28">
            <div className="max-w-2xl">
              <SectionEyebrow>Freelancer keşfi</SectionEyebrow>
              <SectionTitle>Doğru yeteneklerle iş birliği.</SectionTitle>
              <SectionLead>
                CollaCrew, rol bazlı eşleşme ile projene gerçekten uygun freelancerları öne çıkarır.
              </SectionLead>
            </div>

            <div className="mt-12">
              <FreelancerDiscovery />
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] md:grid-cols-3">
              {DISCOVERY_FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className="bg-white p-6">
                  <Icon size={18} className="text-[var(--color-primary-600)]" />
                  <h3 className="mt-4 text-[15px] font-medium text-[var(--color-text-primary)]">{title}</h3>
                  <p className="mt-2 text-sm leading-[22px] text-[var(--color-text-secondary)]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROJECT WORKFLOW / SAFE WORK ------------------------------------ */}
        <section className="border-t border-[var(--color-border-subtle)]">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 lg:py-28">
            <div>
              <SectionEyebrow>Proje yönetimi</SectionEyebrow>
              <SectionTitle>Güvenli çalışma, şeffaf ilerleme.</SectionTitle>
              <SectionLead>
                Ekibin, aşamaların ve bütçen tek bir proje çalışma alanında. Kim neyi teslim etti, ne onaylandı, ne
                bekliyor — her zaman görünür.
              </SectionLead>

              <ul className="mt-8 space-y-3">
                {TRUST_POINTS.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 text-sm leading-[22px] text-[var(--color-text-secondary)]">
                    <ShieldCheck size={15} className="mt-[3px] shrink-0 text-[var(--color-primary-600)]" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>

            <WorkspacePanel />
          </div>
        </section>

        {/* MEMBERSHIP ------------------------------------------------------ */}
        <section id="membership" className="scroll-mt-14 border-t border-[var(--color-border-subtle)] bg-[var(--color-surface-2)]/40">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-28">
            <MembershipPlans />
          </div>
        </section>

        {/* FAQ ------------------------------------------------------------- */}
        <section id="faq" className="scroll-mt-14 border-t border-[var(--color-border-subtle)]">
          <div className="mx-auto grid max-w-6xl gap-10 px-6 py-20 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 lg:py-28">
            <div>
              <SectionEyebrow>SSS</SectionEyebrow>
              <SectionTitle>Sık sorulan sorular</SectionTitle>
            </div>

            <div className="divide-y divide-[var(--color-border-subtle)] border-y border-[var(--color-border-subtle)]">
              {FAQ.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-[var(--color-text-primary)] [&::-webkit-details-marker]:hidden">
                    {item.q}
                    <ChevronDown
                      size={16}
                      className="shrink-0 text-[var(--color-text-muted)] transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="mt-2 max-w-2xl text-sm leading-[22px] text-[var(--color-text-secondary)]">{item.a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* FINAL CTA ------------------------------------------------------- */}
        <section className="border-t border-[var(--color-border-subtle)]">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:px-10 lg:py-28">
            <Reveal
              variant="scale"
              className="relative overflow-hidden rounded-[var(--radius-lg)] bg-[var(--color-text-primary)] px-6 py-14 text-center sm:px-12 sm:py-20"
            >
              <div aria-hidden className="cc-grid-bg pointer-events-none absolute inset-0 opacity-[0.08]" />
              <div className="relative">
                <h2 className="mx-auto max-w-2xl text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-white sm:text-4xl">
                  Projenizi bugün AI ile analiz edin.
                </h2>
                <p className="mx-auto mt-3 max-w-md text-[15px] leading-6 text-white/70">
                  Ücretsiz başlayın, doğru yeteneklerle bir araya gelin.
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                  <Link href="/register" className={buttonClasses({ variant: "primary", size: "lg" })}>
                    Ücretsiz Başla
                    <ArrowRight size={16} />
                  </Link>
                  <Link
                    href="/login"
                    className={buttonClasses({
                      variant: "ghost",
                      size: "lg",
                      className: "text-white! hover:bg-white/10!",
                    })}
                  >
                    Giriş Yap
                  </Link>
                </div>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section typography                                                          */
/* -------------------------------------------------------------------------- */

function SectionEyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-[13px] font-medium text-[var(--color-primary-600)]">{children}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-4xl">
      {children}
    </h2>
  );
}

function SectionLead({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-xl text-[15px] leading-6 text-[var(--color-text-secondary)]">{children}</p>;
}
