import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { buttonClasses } from "@/components/ui/Button";
import LandingNav from "@/components/landing/LandingNav";
import LandingHero from "@/components/landing/LandingHero";
import ProjectFlow from "@/components/landing/ProjectFlow";
import FreelancerDiscovery from "@/components/landing/FreelancerDiscovery";
import WorkspacePanel from "@/components/landing/WorkspacePanel";
import MembershipPlans from "@/components/landing/MembershipPlans";
import LandingFooter from "@/components/landing/LandingFooter";
import { Reveal } from "@/components/landing/Reveal";
import styles from "@/components/landing/LandingJourney.module.css";

/* -------------------------------------------------------------------------- */
/* Content                                                                    */
/* -------------------------------------------------------------------------- */

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
    <div className={styles.page}>
      <LandingNav />

      <main>
        {/* HERO ------------------------------------------------------------ */}
        <LandingHero />

        {/* AI MATCHING / ANALYSIS ------------------------------------------ */}
        <section id="ai-matching" className={`scroll-mt-14 ${styles.section} ${styles.analysisSection}`}>
          <span id="ai-analysis" className="sr-only" aria-hidden />
          <div className={`mx-auto grid max-w-6xl gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-16 ${styles.analysisInner}`}>
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

            <div>
              <div className={`${styles.proof} ${styles.analysisProof}`}>
                <div className={styles.brief}>
                  &quot;Bir e-ticaret sitesi için mobil uyumlu bir arayüz ve ödeme entegrasyonuna ihtiyacım var.&quot;
                </div>

                <div className={styles.analysisLabel}>
                  <Sparkles size={13} />
                  AI analizi · 3 rol önerildi
                </div>

                <ul className={styles.analysisRoles}>
                  {AI_ROLES.map((item, index) => (
                    <Reveal
                      key={item.role}
                      as="li"
                      variant="up"
                      delay={index * 120}
                      className={styles.analysisRow}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.role}</span>
                        <span className={styles.badge} data-tone="primary">Önerilen rol</span>
                      </div>
                      <p className="mt-1 text-[13px] leading-5 text-[var(--color-text-secondary)]">{item.focus}</p>
                      <div className="mt-2.5 flex flex-wrap gap-1">
                        {item.skills.map((skill) => (
                          <span
                            key={skill}
                            className={styles.skill}
                          >
                            {skill}
                          </span>
                        ))}
                      </div>
                    </Reveal>
                  ))}
                </ul>
              </div>
              <div className={styles.aiNote}>
                <Image src="/images/collacrew-mascot.png" alt="" width={54} height={54} sizes="54px" />
                <span>Briefinden ekibine, ilk adım AI ile.</span>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS ---------------------------------------------------- */}
        <section id="how-it-works" className={`scroll-mt-14 ${styles.section}`}>
          <div className={`mx-auto max-w-6xl px-6 sm:px-10 ${styles.sectionInner}`}>
            <div className="max-w-2xl">
              <SectionEyebrow>Nasıl çalışır</SectionEyebrow>
              <SectionTitle>Briften ödemeye, tek bir akış.</SectionTitle>
              <SectionLead>
                Projeni oluştur, AI analiz etsin, doğru yeteneklerle eşleş — teklif, çalışma ve hakediş aynı yerde
                ilerlesin.
              </SectionLead>
            </div>

            <div className="mt-10">
              <ProjectFlow />
            </div>
          </div>
        </section>

        {/* FREELANCER DISCOVERY -------------------------------------------- */}
        <section className={`overflow-hidden ${styles.section} ${styles.discoverySection}`}>
          <div className={`mx-auto max-w-6xl px-6 sm:px-10 ${styles.sectionInner}`}>
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

            <div className={styles.features}>
              {DISCOVERY_FEATURES.map(({ icon: Icon, title, description }) => (
                <div key={title} className={styles.feature}>
                  <span className={styles.featureIcon}><Icon size={17} aria-hidden="true" /></span>
                  <h3 className="mt-4 text-[15px] font-medium text-[var(--color-text-primary)]">{title}</h3>
                  <p className="mt-2 text-sm leading-[22px] text-[var(--color-text-secondary)]">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PROJECT WORKFLOW / SAFE WORK ------------------------------------ */}
        <section className={styles.section}>
          <div className={`mx-auto grid max-w-6xl gap-12 px-6 sm:px-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:gap-16 ${styles.sectionInner}`}>
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
        <section id="membership" className={`scroll-mt-14 ${styles.section} ${styles.membershipSection}`}>
          <div className={`mx-auto max-w-6xl px-6 sm:px-10 ${styles.sectionInner}`}>
            <MembershipPlans />
          </div>
        </section>

        {/* FAQ ------------------------------------------------------------- */}
        <section id="faq" className={`scroll-mt-14 ${styles.section}`}>
          <div className={`mx-auto grid max-w-6xl gap-10 px-6 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16 ${styles.sectionInner}`}>
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
        <section className={styles.finalSection}>
          <div className={styles.finalInner}>
            <div className={styles.finalCopy}>
              <SectionEyebrow>Birlikte başlayalım</SectionEyebrow>
              <SectionTitle>Projenizi bugün AI ile analiz edin.</SectionTitle>
              <SectionLead>Ücretsiz başlayın, doğru yeteneklerle bir araya gelin.</SectionLead>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/register" className={buttonClasses({ variant: "primary", size: "lg" })}>
                  Ücretsiz Başla <ArrowRight size={16} aria-hidden="true" />
                </Link>
                <Link href="/login" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                  Giriş Yap
                </Link>
              </div>
            </div>
            <div className={styles.finalArt} aria-hidden="true">
              <Image src="/images/collacrew-mascot.png" alt="" width={270} height={270} sizes="(max-width: 767px) 160px, 270px" />
              <Sparkles className={styles.finalSpark} size={22} />
            </div>
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
  return <p className={styles.eyebrow}>{children}</p>;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className={styles.title}>
      {children}
    </h2>
  );
}

function SectionLead({ children }: { children: React.ReactNode }) {
  return <p className={styles.lead}>{children}</p>;
}
