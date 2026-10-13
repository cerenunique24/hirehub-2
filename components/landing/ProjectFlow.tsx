"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./LandingJourney.module.css";

/**
 * "Nasıl çalışır" — scroll-driven progression through the real product flow.
 * Desktop: sticky stage list on the left, the active stage follows whichever
 * stage panel is centred in the viewport. Mobile: a plain vertical list.
 */

type Stage = {
  title: string;
  description: string;
  preview: React.ReactNode;
};

const STAGES: Stage[] = [
  {
    title: "Projeni anlat",
    description: "Kısa bir proje açıklaması yaz — hedefini, kapsamını, bütçeni ve süreni belirt.",
    preview: (
      <PreviewCard title="Yeni proje">
        <Field label="Proje adı" value="E-ticaret mobil uygulaması" />
        <Field label="Açıklama" value="Mobil uyumlu arayüz ve ödeme entegrasyonu…" muted />
        <div className="grid grid-cols-2 gap-3">
          <Field label="Bütçe" value="₺85.000" />
          <Field label="Süre" value="6 hafta" />
        </div>
      </PreviewCard>
    ),
  },
  {
    title: "CollaCrew AI analiz etsin",
    description: "AI, projeni analiz ederek gerekli rolleri, becerileri ve sorumlulukları çıkarır.",
    preview: (
      <PreviewCard title="AI proje analizi" accent>
        {[
          ["UI/UX Designer", "Figma · Mobil tasarım"],
          ["Frontend Developer", "Next.js · TypeScript"],
          ["Backend Developer", "Node.js · Ödeme API"],
        ].map(([role, skills]) => (
          <Row key={role} title={role} meta={skills} badge="Önerilen rol" />
        ))}
      </PreviewCard>
    ),
  },
  {
    title: "Doğru yeteneklerle eşleş",
    description: "Her rol; beceri, deneyim ve profil verisine göre en uygun freelancerlarla eşleşir.",
    preview: (
      <PreviewCard title="Rol bazlı eşleşme" surface="team">
        <Row title="UI/UX Designer" meta="Figma · Mobil tasarım" badge="%94 eşleşme" tone="primary" />
        <Row title="Frontend Developer" meta="Next.js · TypeScript" badge="%91 eşleşme" tone="primary" />
        <Row title="Backend Developer" meta="Node.js · Ödeme API" badge="%88 eşleşme" tone="primary" />
      </PreviewCard>
    ),
  },
  {
    title: "Teklifleri değerlendir",
    description: "Freelancerlar yalnızca eşleştikleri rolün bütçe ve süresini görür; teklifleri tek ekranda karşılaştır.",
    preview: (
      <PreviewCard title="Gelen teklifler">
        <Row title="Frontend Developer · Teklif 1" meta="₺28.000 · 21 gün" badge="Kabul edildi" tone="success" />
        <Row title="Frontend Developer · Teklif 2" meta="₺31.500 · 18 gün" badge="Bekliyor" tone="warning" />
        <Row title="Frontend Developer · Teklif 3" meta="₺26.000 · 30 gün" badge="Bekliyor" tone="warning" />
      </PreviewCard>
    ),
  },
  {
    title: "Ekip olarak çalışın",
    description: "Mesajlar, dosyalar ve aşamalar tek bir proje çalışma alanında toplanır.",
    preview: (
      <PreviewCard title="Proje çalışma alanı">
        <Row title="Tasarım teslimi" meta="UI/UX Designer · 3 dosya" badge="Tamamlandı" tone="success" />
        <Row title="Ürün listeleme ekranı" meta="Frontend Developer" badge="Devam ediyor" tone="primary" />
        <Row title="Ödeme entegrasyonu" meta="Backend Developer" badge="Sırada" />
      </PreviewCard>
    ),
  },
  {
    title: "Aşamaları onayla",
    description: "Tamamlanan aşamaları onayla; bütçe, onaylanan ve bekleyen hakedişi tek yerden takip et.",
    preview: (
      <PreviewCard title="Bütçe / hakediş özeti">
        <div className="grid grid-cols-3 gap-3">
          <Field label="Bütçe" value="₺85.000" />
          <Field label="Onaylanan" value="₺32.000" />
          <Field label="Bekleyen" value="₺18.500" />
        </div>
        <div className="h-1.5 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-surface-2)]">
          <div className="h-full w-[38%] rounded-[var(--radius-pill)] bg-[var(--color-primary-600)]" />
        </div>
      </PreviewCard>
    ),
  },
];

export default function ProjectFlow() {
  const [active, setActive] = useState(0);
  const stageRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const index = Number((entry.target as HTMLElement).dataset.index);
            setActive(index);
          }
        });
      },
      // A thin band across the middle of the viewport decides the active stage.
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );

    stageRefs.current.forEach((node) => node && observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-16">
      {/* Sticky stage index (desktop) */}
      <div className="hidden lg:block">
        <ol className={styles.flowIndex}>
          {STAGES.map((stage, index) => {
            const isActive = index === active;
            const isDone = index < active;

            return (
              <li key={stage.title}>
                <button
                  type="button"
                  onClick={() => stageRefs.current[index]?.scrollIntoView({ behavior: "smooth", block: "center" })}
                  aria-current={isActive ? "step" : undefined}
                  className={[styles.step, isDone ? styles.stepDone : ""].join(" ")}
                >
                  <span className={styles.stepNumber}>{String(index + 1).padStart(2, "0")}</span>

                  <span className="min-w-0">
                    <span className="block text-xs text-[var(--color-text-muted)]">Adım {index + 1}</span>
                    <span
                      className={`block text-[15px] font-medium leading-6 transition-colors ${
                        isActive ? "text-[var(--color-text-primary)]" : "text-[var(--color-text-secondary)]"
                      }`}
                    >
                      {stage.title}
                    </span>
                    <span
                      className={`grid transition-[grid-template-rows,opacity] duration-500 ${
                        isActive ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                    >
                      <span className="overflow-hidden">
                        <span className="block pt-1 text-sm leading-[22px] text-[var(--color-text-secondary)]">
                          {stage.description}
                        </span>
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Stage panels */}
      <div className="space-y-6 lg:space-y-0">
        {STAGES.map((stage, index) => {
          const isActive = index === active;

          return (
            <div
              key={stage.title}
              ref={(node) => {
                stageRefs.current[index] = node;
              }}
              data-index={index}
              className={styles.stage}
            >
              <div className="w-full">
                {/* Mobile heading */}
                <div className="mb-3 flex items-start gap-3 lg:hidden">
                  <span className={`${styles.stepNumber} ${styles.mobileNumber}`}>
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <p className="text-xs text-[var(--color-text-muted)]">Adım {index + 1}</p>
                    <p className="text-[15px] font-medium leading-6 text-[var(--color-text-primary)]">{stage.title}</p>
                    <p className="mt-1 text-sm leading-[22px] text-[var(--color-text-secondary)]">{stage.description}</p>
                  </div>
                </div>

                <div
                  className={`transition-transform duration-500 motion-reduce:transition-none lg:origin-left ${
                    isActive ? "lg:scale-100" : "lg:scale-[0.98]"
                  }`}
                >
                  {stage.preview}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */

function PreviewCard({
  title,
  accent = false,
  surface = "standard",
  children,
}: {
  title: string;
  accent?: boolean;
  surface?: "standard" | "team";
  children: React.ReactNode;
}) {
  return (
    <div className={[styles.proof, styles.preview].join(" ")} data-surface={accent ? "ai" : surface}>
      <div className={styles.previewHeader}>
        <p className="text-sm font-medium text-[var(--color-text-primary)]">{title}</p>
        <span aria-hidden="true" className={[styles.previewMark, accent ? styles.previewMarkAccent : ""].join(" ")} />
      </div>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Field({ label, value, muted = false }: { label: string; value: string; muted?: boolean }) {
  return (
    <div>
      <p className="text-xs text-[var(--color-text-muted)]">{label}</p>
      <p
        className={`${styles.field} ${
          muted ? "text-[var(--color-text-secondary)]" : "font-medium text-[var(--color-text-primary)]"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

type RowTone = "neutral" | "primary" | "success" | "warning";

function Row({
  title,
  meta,
  badge,
  tone = "neutral",
}: {
  title: string;
  meta: string;
  badge: string;
  tone?: RowTone;
}) {
  return (
    <div className={styles.previewRow} data-tone={tone}>
      <div className="min-w-0">
        <p className={`truncate ${styles.itemTitle}`}>{title}</p>
        <p className={`truncate ${styles.metadata}`}>{meta}</p>
      </div>
      <span className={styles.badge} data-tone={tone}>
        {badge}
      </span>
    </div>
  );
}
