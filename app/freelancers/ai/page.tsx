"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FreelancerWorkspace } from "@/lib/ai/workspace";
import { buttonClasses } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils/formatCurrency";
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
 * Freelancer CollaCrew AI — "Sana doğru projeyi bul ve başvurmanı kolaylaştır."
 * All data and plan gating come from GET /api/ai/freelancer-workspace.
 * Suggestions never change the profile: the user applies them on /profile.
 */
export default function FreelancerAIPage() {
  const [workspace, setWorkspace] = useState<FreelancerWorkspace | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await fetch("/api/ai/freelancer-workspace");
        const data = await response.json().catch(() => ({}));
        if (cancelled) return;
        if (!response.ok) {
          setError(data?.error || "CollaCrew AI yüklenemedi.");
          return;
        }
        setWorkspace(data as FreelancerWorkspace);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const plan = workspace?.plan ?? "free";
  const profile = workspace?.profile;

  return (
    <div className="space-y-10">
      <WorkspaceHeader
        plan={plan}
        description="Profilini, fırsatlarını ve başvurularını yapay zekâ ile daha akıllı yönet."
      />

      {error && (
        <p className="rounded-[var(--radius-input)] border border-red-200 bg-[var(--color-error-50)] px-3 py-2.5 text-sm text-[var(--color-error-600)]">
          {error}
        </p>
      )}

      {loading ? (
        <WorkspaceSkeleton />
      ) : workspace ? (
        <>
          <SummaryStats
            items={[
              { value: workspace.summary.suitableProjects, label: "Uygun proje" },
              { value: workspace.summary.strongMatches, label: "Güçlü eşleşme" },
              { value: workspace.summary.insights, label: "AI içgörüsü" },
            ]}
          />

          <div className="grid gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
            {/* SANA UYGUN PROJELER */}
            <section>
              <SectionHeading title="Sana uygun projeler" />

              {workspace.recommendations.length === 0 ? (
                <p className="border-t border-[var(--color-border-subtle)] pt-4 text-[13px] text-[var(--color-text-secondary)]">
                  Şu an profilinle uyumlu açık bir rol bulunamadı. Profilindeki beceri ve uzmanlık alanlarını güncel
                  tutmak eşleşmeleri doğrudan etkiler.
                </p>
              ) : (
                <ul className="divide-y divide-[var(--color-border-subtle)] border-t border-[var(--color-border-subtle)]">
                  {workspace.recommendations.map((item) => (
                    <li key={`${item.projectId}-${item.roleId}`} className="py-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] font-medium leading-6 text-[var(--color-text-primary)]">{item.title}</p>
                          <p className="text-[13px] text-[var(--color-text-secondary)]">{item.role}</p>
                        </div>
                        <ScoreBadge score={item.score} />
                      </div>

                      <p className="mt-2 text-[13px] leading-5 text-[var(--color-text-secondary)]">{item.reason}</p>

                      {item.matchingSkills && item.matchingSkills.length > 0 && (
                        <div className="mt-2">
                          <SkillChips skills={item.matchingSkills.slice(0, 6)} tone="primary" />
                        </div>
                      )}

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[13px] tabular-nums text-[var(--color-text-secondary)]">
                          {[item.budgetPerPerson ? formatCurrency(item.budgetPerPerson) : null, item.duration]
                            .filter(Boolean)
                            .join(" · ") || "Bütçe belirtilmemiş"}
                        </p>
                        <Link
                          href={`/freelancers/discover/${item.projectId}`}
                          className={buttonClasses({ variant: "secondary", size: "sm" })}
                        >
                          Projeyi incele
                        </Link>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {workspace.nearMatches && workspace.nearMatches.length > 0 && (
                <div className="mt-8">
                  <p className="text-sm font-medium text-[var(--color-text-primary)]">Yakın eşleşmeler</p>
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    Henüz uygun sayılmadığın ama profiline yakın roller.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {workspace.nearMatches.map((item) => (
                      <li key={`${item.projectId}-${item.roleId}`} className="flex items-center justify-between gap-3 text-[13px]">
                        <span className="min-w-0 truncate text-[var(--color-text-secondary)]">
                          {item.title} · {item.role}
                        </span>
                        <ScoreBadge score={item.score} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>

            {/* AI PROFİL İÇGÖRÜSÜ */}
            <section>
              <SectionHeading title="AI profil içgörüsü" />

              {profile?.strengths ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Profilinde güçlü alanlar</p>
                    {profile.strengths.length > 0 ? (
                      <div className="mt-2">
                        <SkillChips skills={profile.strengths.map((item) => item.skill)} tone="primary" />
                      </div>
                    ) : (
                      <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                        Güçlü alanları belirlemek için henüz yeterli eşleşme yok.
                      </p>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">Sık karşılaşılan beceriler</p>
                    {profile.skillGap && profile.skillGap.length > 0 ? (
                      <>
                        <div className="mt-2">
                          <SkillChips skills={profile.skillGap.map((item) => item.skill)} />
                        </div>
                        <p className="mt-2 text-xs leading-[18px] text-[var(--color-text-muted)]">
                          Son eşleşmelerindeki projelerde bu beceriler daha sık görülüyor; profilinde yer almıyor.
                        </p>
                      </>
                    ) : (
                      <p className="mt-1 text-[13px] text-[var(--color-text-secondary)]">
                        Eşleştiğin rollerde profilinde eksik görünen bir beceri yok.
                      </p>
                    )}
                  </div>

                  {profile.visibility ? (
                    <div>
                      <p className="text-sm font-medium text-[var(--color-text-primary)]">Profil görünürlüğü</p>
                      <p className="mt-1 text-[13px] leading-5 text-[var(--color-text-secondary)]">
                        Açık projelerdeki {profile.visibility.totalOpenRoles} rolden{" "}
                        <strong className="font-medium text-[var(--color-text-primary)]">
                          {profile.visibility.eligibleRoles}
                        </strong>{" "}
                        tanesinde uygun aday olarak listeleniyorsun
                        {profile.visibility.averageScore !== null && <> · ortalama %{profile.visibility.averageScore} eşleşme</>}.
                      </p>
                    </div>
                  ) : (
                    <LockedNotice
                      plan="pro"
                      title="Gelişmiş profil içgörüleri"
                      description="Açık rollerde ne kadar görünür olduğunu ve ortalama eşleşme gücünü gör."
                    />
                  )}
                </div>
              ) : (
                <LockedNotice
                  plan="plus"
                  title="Güçlü alanlar ve beceri açığı"
                  description="Eşleşmelerinde öne çıkan becerilerini ve projelerde sık istenip profilinde olmayanları gör."
                />
              )}
            </section>
          </div>

          {/* AI İLE PROFİLİNİ GELİŞTİR */}
          <section className="border-t border-[var(--color-border-subtle)] pt-8">
            <SectionHeading title="AI ile profilini geliştir" />

            <div className="flex flex-wrap items-center gap-x-8 gap-y-4">
              <div>
                <p className="text-xs text-[var(--color-text-muted)]">Profil skoru</p>
                <p className="text-[28px] font-semibold leading-9 tabular-nums text-[var(--color-text-primary)]">
                  {profile?.completion !== null && profile?.completion !== undefined ? `%${profile.completion}` : "—"}
                </p>
              </div>

              {profile?.suggestions ? (
                <button
                  type="button"
                  onClick={() => setShowSuggestions((value) => !value)}
                  className={buttonClasses({ variant: "secondary", size: "md" })}
                  aria-expanded={showSuggestions}
                >
                  {showSuggestions ? "Önerileri gizle" : `Önerileri gör (${profile.suggestions.length})`}
                </button>
              ) : (
                <div className="min-w-[260px] flex-1">
                  <LockedNotice
                    plan="plus"
                    title="AI profil önerileri"
                    description="Profil verine dayalı, uygulaması tamamen senin onayına bağlı öneriler."
                  />
                </div>
              )}
            </div>

            {showSuggestions && profile?.suggestions && (
              <div className="cc-appear mt-6">
                {profile.suggestions.length === 0 ? (
                  <p className="text-[13px] text-[var(--color-text-secondary)]">Profilin için şu an bir öneri yok.</p>
                ) : (
                  <ol className="max-w-2xl space-y-3">
                    {profile.suggestions.map((suggestion, index) => (
                      <li key={suggestion.id} className="flex gap-3 text-sm leading-[22px] text-[var(--color-text-secondary)]">
                        <span className="w-5 shrink-0 tabular-nums text-[var(--color-text-muted)]">{index + 1}.</span>
                        {suggestion.text}
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-4 text-xs text-[var(--color-text-muted)]">
                  Öneriler profilini değiştirmez; uygulamak istediklerini profil sayfandan düzenleyebilirsin.
                </p>
                <Link href="/freelancers/profile" className={buttonClasses({ size: "sm", className: "mt-3" })}>
                  Profili düzenle
                </Link>
              </div>
            )}
          </section>

          <LockedFeatureList items={workspace.locked} />
        </>
      ) : null}
    </div>
  );
}
