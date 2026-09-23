"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, FolderPlus } from "lucide-react";
import type { ClientWorkspace } from "@/lib/ai/workspace";
import { buttonClasses } from "@/components/ui/Button";
import {
  LockedFeatureList,
  LockedNotice,
  ScoreBadge,
  SectionHeading,
  SkillChips,
  SummaryStats,
  WorkspaceHeader,
  WorkspaceSkeleton,
} from "@/components/ai-workspace/WorkspaceUI";

/**
 * Client CollaCrew AI — "Projem için doğru insanı bul."
 * All data and plan gating come from GET /api/ai/client-workspace; this page
 * only renders what the server returned for the real subscription.
 */
export default function ClientAIPage() {
  const [workspace, setWorkspace] = useState<ClientWorkspace | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : "";
        const response = await fetch(`/api/ai/client-workspace${query}`);
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError(data?.error || "CollaCrew AI yüklenemedi.");
          return;
        }
        setError("");
        setWorkspace(data as ClientWorkspace);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const plan = workspace?.plan ?? "free";
  const locked = new Set(workspace?.locked.map((item) => item.key) ?? []);
  const projectSelector =
    workspace && workspace.projects.length > 1 ? (
      <label className="flex items-center gap-2 text-[13px] text-[var(--color-text-secondary)]">
        Proje
        <select
          value={workspace.project?.id ?? ""}
          onChange={(event) => {
            setLoading(true);
            setProjectId(event.target.value);
          }}
          className="cc-filter-text h-[var(--control-height-md)] max-w-[260px] truncate rounded-[var(--radius-select)] border border-[var(--color-border-subtle)] bg-white px-3 text-[var(--color-text-primary)] outline-none focus:border-[var(--color-primary-600)]"
        >
          {workspace.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.title}
            </option>
          ))}
        </select>
      </label>
    ) : null;

  return (
    <div className="space-y-10">
      <WorkspaceHeader
        plan={plan}
        description="Projeni analiz et, doğru rolleri belirle ve sana en uygun freelancerları keşfet."
        action={projectSelector}
      />

      {error && (
        <p className="rounded-[var(--radius-input)] border border-red-200 bg-[var(--color-error-50)] px-3 py-2.5 text-sm text-[var(--color-error-600)]">
          {error}
        </p>
      )}

      {loading && !workspace ? (
        <WorkspaceSkeleton />
      ) : workspace && !workspace.project ? (
        <div className="border-y border-[var(--color-border-subtle)] py-12 text-center">
          <p className="cc-h3 text-[var(--color-text-primary)]">Henüz analiz edilecek bir projen yok</p>
          <p className="cc-body-sm mt-2 text-[var(--color-text-secondary)]">
            Bir proje oluştur; CollaCrew AI rolleri çıkarsın ve uygun freelancerları bulsun.
          </p>
          <Link href="/client/create-project" className={buttonClasses({ size: "md", className: "mt-5" })}>
            <FolderPlus size={15} />
            Proje oluştur
          </Link>
        </div>
      ) : workspace ? (
        <div className={loading ? "opacity-60 transition-opacity" : "transition-opacity"}>
          {/* AI ÖZETİ */}
          <section>
            <p className="mb-3 text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
              AI özeti · {workspace.project?.title}
            </p>
            <SummaryStats
              items={[
                { value: workspace.summary.eligibleFreelancers, label: "Uygun freelancer" },
                { value: workspace.summary.strongMatches, label: "Güçlü eşleşme" },
                { value: workspace.summary.suggestedRoles, label: "Önerilen rol" },
              ]}
            />
          </section>

          <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            {/* PROJE İÇGÖRÜSÜ */}
            <section>
              <SectionHeading title="Proje içgörüsü" />

              <ul className="space-y-1.5 text-sm text-[var(--color-text-secondary)]">
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[var(--color-primary-600)]" /> Proje analiz edildi
                </li>
                <li className="flex items-center gap-2">
                  <Check size={14} className="text-[var(--color-primary-600)]" /> {workspace.roles.length} rol önerildi
                </li>
              </ul>

              <ol className="mt-6 divide-y divide-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)]">
                {workspace.roles.map((role) => (
                  <li key={role.roleId} className="py-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[15px] font-medium text-[var(--color-text-primary)]">{role.role}</p>
                      <span className="text-xs text-[var(--color-text-muted)]">{role.eligibleCount} uygun aday</span>
                    </div>
                    {role.requiredSkills.length > 0 && (
                      <div className="mt-2">
                        <SkillChips skills={role.requiredSkills} />
                      </div>
                    )}
                    {role.coverage && (
                      <p
                        className={`mt-2 text-xs ${
                          role.coverage === "covered"
                            ? "text-[var(--color-success-600)]"
                            : role.coverage === "thin"
                              ? "text-[var(--color-warning-600)]"
                              : "text-[var(--color-error-600)]"
                        }`}
                      >
                        {role.coverage === "covered"
                          ? "Ekip kapsamı iyi"
                          : role.coverage === "thin"
                            ? "Tek aday — yedek yok"
                            : "Uygun aday yok"}
                      </p>
                    )}
                  </li>
                ))}
              </ol>

              <div className="mt-8">
                {workspace.optimizations ? (
                  <>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">AI proje optimizasyonu</p>
                    {workspace.optimizations.length === 0 ? (
                      <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">
                        Tüm roller için yeterli uygun aday var.
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2 text-[13px] leading-5 text-[var(--color-text-secondary)]">
                        {workspace.optimizations.map((tip) => (
                          <li key={tip}>{tip}</li>
                        ))}
                      </ul>
                    )}
                  </>
                ) : (
                  <LockedNotice
                    plan="pro"
                    title="AI proje optimizasyonu ve ekip içgörüleri"
                    description="Rol bazında aday kapsamını ve gerekli becerilerin ekip kurmayı nasıl etkilediğini gör."
                  />
                )}
              </div>
            </section>

            {/* GÜÇLÜ EŞLEŞMELER */}
            <section>
              <SectionHeading
                title="Güçlü eşleşmeler"
                hint={locked.has("ai_freelancer_shortlist") ? "Rol başına ilk 3 aday" : undefined}
              />

              <div className="space-y-8">
                {workspace.roles.map((role) => (
                  <div key={role.roleId}>
                    <p className="text-xs font-medium uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
                      {role.role}
                    </p>

                    {role.candidates.length === 0 ? (
                      <p className="mt-3 text-[13px] text-[var(--color-text-secondary)]">
                        Bu rol için şu an uygun freelancer bulunamadı.
                      </p>
                    ) : (
                      <ul className="mt-2 divide-y divide-[var(--color-border-subtle)]">
                        {role.candidates.map((candidate) => (
                          <li key={candidate.freelancerId} className="py-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <Link
                                  href={`/client/freelancers/${candidate.freelancerId}`}
                                  className="text-sm font-medium text-[var(--color-text-primary)] hover:text-[var(--color-primary-700)]"
                                >
                                  {candidate.name}
                                </Link>
                                {candidate.title && (
                                  <p className="truncate text-[13px] text-[var(--color-text-secondary)]">{candidate.title}</p>
                                )}
                              </div>
                              <div className="flex shrink-0 items-center gap-2">
                                {candidate.isBackup && (
                                  <span className="text-xs text-[var(--color-text-muted)]">Yedek aday</span>
                                )}
                                <ScoreBadge score={candidate.score} />
                              </div>
                            </div>

                            <p className="mt-2 text-[13px] leading-5 text-[var(--color-text-secondary)]">{candidate.reason}</p>

                            {candidate.matchingSkills && candidate.matchingSkills.length > 0 && (
                              <div className="mt-2">
                                <SkillChips skills={candidate.matchingSkills.slice(0, 6)} tone="primary" />
                              </div>
                            )}

                            {candidate.missingSkills && candidate.missingSkills.length > 0 && (
                              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                <span className="text-xs text-[var(--color-text-muted)]">Eksik:</span>
                                <SkillChips skills={candidate.missingSkills} tone="warning" />
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {locked.has("ai_freelancer_shortlist") && (
                <div className="mt-8">
                  <LockedNotice
                    plan="plus"
                    title="Detaylı eşleşme açıklamaları"
                    description="Tüm eşleşme nedenleri, eşleşen beceriler ve rol başına daha fazla aday."
                  />
                </div>
              )}
            </section>
          </div>

          <div className="mt-14">
            <LockedFeatureList items={workspace.locked} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
