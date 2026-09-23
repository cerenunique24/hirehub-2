"use client";

import { useEffect, useState } from "react";
import { Check, FileText, Sparkles, Wallet, CalendarDays, UserRound } from "lucide-react";
import { useInView, usePrefersReducedMotion } from "./Reveal";

/**
 * Hero product visualization — "AI is building your team right now".
 * Project brief → AI analysis → matched freelancers, played once when
 * the composition enters the viewport. Built from the same UI vocabulary
 * as the panel (badges, cards, match %, skills, budget, status).
 */

const ROLES = ["UI/UX Designer", "Frontend Developer", "Backend Developer"];

/**
 * SYNTHETIC DEMO DATA ONLY — never read from `profiles` or any real record.
 * Candidates are shown by role/title, not by a person's name, so nothing on
 * the landing page can identify a real user.
 */
const MATCHES = [
  { role: "UI/UX Designer", detail: "5+ yıl · Müsait", score: 94, skills: ["Figma", "Design System", "Mobile"] },
  { role: "Frontend Developer", detail: "4 yıl · Müsait", score: 91, skills: ["Next.js", "TypeScript", "Tailwind"] },
  { role: "Backend Developer", detail: "6 yıl · Kısmen müsait", score: 88, skills: ["Node.js", "PostgreSQL", "Ödeme API"] },
];

// Timeline (ms) — calm pacing, runs once.
const PHASE_TIMES = [0, 700, 1500, 2300, 2750, 3200, 3900];

function useCountUp(target: number, active: boolean, instant: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!active || instant) return;

    let frame = 0;
    const start = performance.now();
    const duration = 700;

    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, active, instant]);

  return active && instant ? target : value;
}

export default function HeroMatching() {
  const { ref, inView } = useInView<HTMLDivElement>(0.2);
  const reduced = usePrefersReducedMotion();
  const [timedPhase, setPhase] = useState(0);
  // Reduced motion: skip the timeline and show the finished state.
  const phase = reduced && inView ? PHASE_TIMES.length : timedPhase;

  useEffect(() => {
    if (!inView || reduced) return;

    const timers = PHASE_TIMES.map((time, index) => window.setTimeout(() => setPhase(index + 1), time));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [inView, reduced]);

  // phase 1: project · 2: analyzing · 3: roles · 4-6: matches · 7: team ready
  const analyzing = phase >= 2;
  const rolesReady = phase >= 3;
  const teamReady = phase >= 7;

  return (
    <div ref={ref} className="relative">
      {/* status line */}
      <div className="mb-3 flex items-center justify-between gap-3 text-xs text-[var(--color-text-secondary)]">
        <span className="inline-flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-[var(--radius-pill)] ${
              teamReady ? "bg-[var(--color-success-600)]" : "bg-[var(--color-primary-600)] motion-safe:animate-pulse"
            }`}
          />
          {teamReady ? "Ekip hazır — 3 rol eşleşti" : "CollaCrew AI şu anda ekibini oluşturuyor"}
        </span>
        <span className="hidden font-mono text-[var(--color-text-muted)] sm:inline">collacrew.ai/match</span>
      </div>

      <div className="grid gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-3 shadow-[var(--shadow-lg)] md:grid-cols-[1fr_0.9fr_1.15fr] md:p-4">
        {/* 1 — Project */}
        <Panel label="Proje" visible={phase >= 1}>
          <div className="flex items-start gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
              <FileText size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-5 text-[var(--color-text-primary)]">E-ticaret mobil uygulaması</p>
              <p className="mt-0.5 text-xs text-[var(--color-text-muted)]">Yayında · 2 dk önce</p>
            </div>
          </div>

          <p className="mt-3 text-[13px] leading-5 text-[var(--color-text-secondary)]">
            &quot;Mobil uyumlu bir arayüz ve ödeme entegrasyonu olan bir e-ticaret uygulamasına ihtiyacım var.&quot;
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--color-border-subtle)] pt-3">
            <Meta icon={Wallet} label="Bütçe" value="₺85.000" />
            <Meta icon={CalendarDays} label="Süre" value="6 hafta" />
          </div>
        </Panel>

        {/* 2 — AI analysis */}
        <Panel label="AI analiz" visible={phase >= 2} accent>
          <div className="flex items-center gap-2 text-xs font-medium text-[var(--color-primary-700)]">
            <Sparkles size={13} className={analyzing && !rolesReady ? "motion-safe:animate-pulse" : ""} />
            {rolesReady ? "Analiz tamamlandı" : "Brief analiz ediliyor…"}
          </div>

          <div className="mt-2.5 h-1 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-primary-600)]/10">
            <div
              className="h-full rounded-[var(--radius-pill)] bg-[var(--color-primary-600)] transition-[width] duration-[1200ms] ease-out"
              style={{ width: rolesReady ? "100%" : analyzing ? "55%" : "0%" }}
            />
          </div>

          <p className="mt-4 text-xs text-[var(--color-text-muted)]">Gerekli roller</p>
          <ul className="mt-2 space-y-1.5">
            {ROLES.map((role, index) => (
              <li
                key={role}
                className="cc-reveal flex items-center justify-between rounded-[var(--radius-sm)] bg-white px-2.5 py-1.5 text-[13px] text-[var(--color-text-primary)] ring-1 ring-[var(--color-border-subtle)]"
                data-variant="up"
                data-visible={rolesReady ? "true" : "false"}
                style={{ "--reveal-delay": `${index * 120}ms` } as React.CSSProperties}
              >
                {role}
                <Check size={13} className="text-[var(--color-primary-600)]" />
              </li>
            ))}
          </ul>
        </Panel>

        {/* 3 — Matches */}
        <Panel label="Eşleşen freelancerlar" visible={phase >= 3}>
          <ul className="space-y-2">
            {MATCHES.map((match, index) => (
              <MatchCard key={match.role} match={match} visible={phase >= 4 + index} instant={reduced} />
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  );
}

function Panel({
  label,
  visible,
  accent = false,
  children,
}: {
  label: string;
  visible: boolean;
  accent?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`cc-reveal rounded-[var(--radius-card)] border p-3.5 ${
        accent
          ? "border-[var(--color-primary-600)]/20 bg-[var(--color-primary-50)]/60"
          : "border-[var(--color-border-subtle)] bg-[var(--color-canvas)]"
      }`}
      data-variant="up"
      data-visible={visible ? "true" : "false"}
    >
      <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">{label}</p>
      {children}
    </div>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)]">
        <Icon size={12} /> {label}
      </p>
      <p className="mt-1 text-sm font-medium leading-5 text-[var(--color-text-primary)]">{value}</p>
    </div>
  );
}

function MatchCard({
  match,
  visible,
  instant,
}: {
  match: (typeof MATCHES)[number];
  visible: boolean;
  instant: boolean;
}) {
  const score = useCountUp(match.score, visible, instant);

  return (
    <li
      className="cc-reveal rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-white p-2.5"
      data-variant="scale"
      data-visible={visible ? "true" : "false"}
    >
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
          <UserRound size={15} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium leading-[18px] text-[var(--color-text-primary)]">{match.role}</p>
          <p className="truncate text-xs text-[var(--color-text-muted)]">{match.detail}</p>
        </div>
        <span className="shrink-0 rounded-[var(--radius-pill)] bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-medium tabular-nums text-[var(--color-primary-700)]">
          %{score}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {match.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs leading-4 text-[var(--color-text-secondary)]"
          >
            {skill}
          </span>
        ))}
      </div>
    </li>
  );
}
