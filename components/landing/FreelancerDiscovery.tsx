"use client";

import { Sparkles, UserRound } from "lucide-react";
import { useInView } from "./Reveal";

/**
 * Freelancer discovery — cards slide in horizontally with a small stagger
 * when the row scrolls into view. On mobile the row is a contained,
 * snap-scrolling strip (no page-level horizontal overflow).
 */

/**
 * SYNTHETIC DEMO DATA ONLY — never read from `profiles` or any real record.
 * Candidates are shown by role/title, not by a person's name, so nothing on
 * the landing page can identify a real user.
 */
const FREELANCERS = [
  { role: "Product Designer", detail: "5+ yıl deneyim", score: 94, rate: "₺650 / saat", skills: ["Figma", "Design System", "Prototip"] },
  { role: "UX Researcher", detail: "4 yıl deneyim", score: 91, rate: "₺600 / saat", skills: ["Kullanıcı testi", "Analiz", "Persona"] },
  { role: "Architect", detail: "6 yıl deneyim", score: 89, rate: "₺750 / saat", skills: ["AutoCAD", "SketchUp", "3D Görselleştirme"] },
  { role: "Frontend Developer", detail: "4 yıl deneyim", score: 86, rate: "₺720 / saat", skills: ["Next.js", "TypeScript", "Tailwind"] },
];

export default function FreelancerDiscovery() {
  const { ref, inView } = useInView<HTMLDivElement>(0.3);

  return (
    <div ref={ref} className="-mx-6 overflow-x-auto px-6 pb-2 [scrollbar-width:none] sm:-mx-10 sm:px-10 lg:mx-0 lg:overflow-visible lg:px-0">
      <ul className="flex snap-x snap-mandatory gap-3 lg:grid lg:grid-cols-4 lg:gap-4">
        {FREELANCERS.map((freelancer, index) => (
          <li
            key={freelancer.role}
            className="cc-reveal w-[260px] shrink-0 snap-start rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] bg-white p-4 transition-colors hover:border-[var(--color-border-strong)] lg:w-auto"
            data-variant="right"
            data-visible={inView ? "true" : "false"}
            style={{ "--reveal-delay": `${index * 110}ms` } as React.CSSProperties}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-[var(--radius-pill)] bg-[var(--color-surface-2)] text-[var(--color-text-secondary)]">
                <UserRound size={18} />
              </span>
              <span className="inline-flex items-center gap-1 rounded-[var(--radius-pill)] bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-700)]">
                <Sparkles size={11} />%{freelancer.score} eşleşme
              </span>
            </div>

            <p className="mt-4 text-[15px] font-medium leading-6 text-[var(--color-text-primary)]">{freelancer.role}</p>
            <p className="mt-0.5 text-[13px] leading-5 text-[var(--color-text-secondary)]">{freelancer.detail}</p>

            <div className="mt-4 flex flex-wrap gap-1">
              {freelancer.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-[var(--radius-xs)] bg-[var(--color-surface-2)] px-1.5 py-0.5 text-xs text-[var(--color-text-secondary)]"
                >
                  {skill}
                </span>
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-subtle)] pt-3 text-xs">
              <span className="text-[var(--color-text-muted)]">Saatlik ücret</span>
              <span className="font-medium text-[var(--color-text-primary)]">{freelancer.rate}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
