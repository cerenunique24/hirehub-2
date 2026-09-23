import Link from "next/link";
import { Sparkles } from "lucide-react";

import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";

/**
 * Shape a FreelancerCard can render. Every field beyond `id` is optional —
 * callers pass whatever subset their query already selects, and the card
 * omits any section it doesn't have data for rather than showing empty
 * space or invented values.
 */
export type FreelancerCardData = {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  avatar_url?: string | null;
  title?: string | null;
  bio?: string | null;
  skills?: string[] | null;
  experience?: string | null;
  hourly_rate?: number | null;
  /** "available" | "limited" | "unavailable" — see components/freelancers/AvailabilityCard.tsx */
  availability_status?: string | null;
};

const AVAILABILITY_LABEL: Record<string, string> = {
  available: "Müsait",
  limited: "Kısmen müsait",
  unavailable: "Müsait değil",
};

const AVAILABILITY_DOT: Record<string, string> = {
  available: "bg-[var(--color-success-600)]",
  limited: "bg-[var(--color-warning-600)]",
  unavailable: "bg-[var(--color-text-muted)]",
};

const MAX_VISIBLE_SKILLS = 4;

/**
 * CollaCrew Design System — FreelancerCard.
 *
 * Horizontal, reusable freelancer summary card used by both the Client
 * and Freelancer panels. `matchScore` is intentionally optional and only
 * ever set by a caller that has real project-matching context (e.g. an
 * AI shortlist for a specific project) — there is no default/fallback
 * score, since a freelancer has no single permanent match percentage.
 */
export function FreelancerCard({
  freelancer,
  viewerRole,
  matchScore,
  action,
  className = "",
}: {
  freelancer: FreelancerCardData;
  viewerRole: "client" | "freelancer";
  matchScore?: number;
  /** Optional extra action rendered alongside "Profili İncele" (e.g. a coalition-invite button). */
  action?: React.ReactNode;
  className?: string;
}) {
  const name =
    [freelancer.first_name, freelancer.last_name].filter(Boolean).join(" ").trim() || "Freelancer";

  const href = viewerRole === "client" ? `/client/freelancers/${freelancer.id}` : `/freelancers/${freelancer.id}`;

  const skills = freelancer.skills ?? [];
  const visibleSkills = skills.slice(0, MAX_VISIBLE_SKILLS);
  const remainingSkills = skills.length - visibleSkills.length;

  const availabilityLabel = freelancer.availability_status
    ? AVAILABILITY_LABEL[freelancer.availability_status]
    : undefined;

  const hasRate = typeof freelancer.hourly_rate === "number" && freelancer.hourly_rate > 0;
  const hasMetrics = hasRate || Boolean(freelancer.experience);

  return (
    <div
      className={[
        "flex flex-col gap-4 rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 transition hover:border-[var(--color-border-strong)] sm:flex-row",
        className,
      ].join(" ")}
    >
      {/* Profile + bio + skills */}
      <div className="min-w-0 flex-1">
        <div className="flex items-start gap-3">
          <Avatar src={freelancer.avatar_url} name={name} size="md" />

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={href}
                className="truncate text-[15px] font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-600)]"
              >
                {name}
              </Link>

              {typeof matchScore === "number" && (
                <Badge tone="ai" className="shrink-0 gap-1">
                  <Sparkles size={11} />%{Math.round(matchScore)} eşleşme
                </Badge>
              )}
            </div>

            {freelancer.title && (
              <p className="mt-0.5 truncate text-[13px] text-[var(--color-text-secondary)]">{freelancer.title}</p>
            )}
          </div>
        </div>

        {freelancer.bio && (
          <p className="mt-3 line-clamp-2 text-[13px] leading-5 text-[var(--color-text-secondary)]">
            {freelancer.bio}
          </p>
        )}

        {visibleSkills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {visibleSkills.map((skill) => (
              <Badge key={skill} tone="neutral">
                {skill}
              </Badge>
            ))}
            {remainingSkills > 0 && <Badge tone="neutral">+{remainingSkills}</Badge>}
          </div>
        )}
      </div>

      {/* Metrics + availability + action */}
      <div className="flex shrink-0 flex-col gap-4 border-t border-[var(--color-border-subtle)] pt-4 sm:w-[188px] sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0">
        {hasMetrics && (
          <div className="flex flex-wrap gap-4">
            {hasRate && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Ücret</p>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                  ₺{freelancer.hourly_rate}/sa
                </p>
              </div>
            )}

            {freelancer.experience && (
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Deneyim</p>
                <p className="mt-0.5 text-sm font-medium text-[var(--color-text-primary)]">
                  {freelancer.experience}
                </p>
              </div>
            )}
          </div>
        )}

        {availabilityLabel && freelancer.availability_status && (
          <div className="flex items-center gap-1.5">
            <span
              className={["h-1.5 w-1.5 shrink-0 rounded-full", AVAILABILITY_DOT[freelancer.availability_status]].join(
                " "
              )}
            />
            <span className="text-xs text-[var(--color-text-secondary)]">{availabilityLabel}</span>
          </div>
        )}

        <div className="mt-auto flex flex-col gap-2">
          <Link
            href={href}
            className="inline-flex h-9 w-full items-center justify-center rounded-lg border border-[var(--color-border-subtle)] text-[13px] font-medium text-[var(--color-text-primary)] transition hover:border-[var(--color-primary-600)] hover:text-[var(--color-primary-600)]"
          >
            Profili İncele
          </Link>

          {action}
        </div>
      </div>
    </div>
  );
}

export default FreelancerCard;
