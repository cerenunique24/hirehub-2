"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import type { ProfileAnalysis, ProjectRecommendation } from "@/types/ai";
import { createClient } from "@/lib/supabase/client";

export default function FreelancerAIPage() {
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<ProjectRecommendation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const supabase = createClient();

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: profile }, { count: portfolioCount }] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("first_name, last_name, bio, skills, avatar_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("portfolio_items")
            .select("id", { count: "exact", head: true })
            .eq("freelancer_id", user.id),
        ]);

      const name = [profile?.first_name, profile?.last_name]
        .filter(Boolean)
        .join(" ") || "Freelancer";

      const skills = Array.isArray(profile?.skills) ? profile.skills : [];

      const [profileRes, projectsRes] = await Promise.all([
        fetch("/api/ai/analyze-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            bio: profile?.bio ?? "",
            skills,
            portfolioCount: portfolioCount ?? 0,
            avatar: profile?.avatar_url ?? undefined,
          }),
        }),
        fetch("/api/ai/recommend-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills }),
        }),
      ]);

      const profileData = await profileRes.json();
      const projectsData = await projectsRes.json();

      setProfileAnalysis(profileData.analysis ?? null);
      setRecommendations(projectsData.recommendations ?? []);
      setLoading(false);
    }

    void load();
  }, []);

  return (
    <div className="space-y-6 p-8">
      <div>
        <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-500">
          <Sparkles size={16} />
          CollaCrew AI
        </div>
        <h1 className="text-3xl font-bold text-neutral-900">Freelancer Intelligence</h1>
        <p className="mt-2 text-neutral-500">
          Profile strength, project recommendations, and proposal assistance.
        </p>
      </div>

      {loading && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-10 text-center text-sm text-neutral-500 shadow-sm">
          Profilin analiz ediliyor...
        </div>
      )}

      {!loading && profileAnalysis && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Profile Analysis</h2>
          <p className="mt-2 text-4xl font-bold">{profileAnalysis.strength}%</p>
          <p className="mt-1 text-sm text-neutral-500">Profile strength</p>
          {profileAnalysis.suggestions.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm text-neutral-600">
              {profileAnalysis.suggestions.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Recommended Projects</h2>

          {recommendations.length === 0 ? (
            <p className="mt-4 text-sm text-neutral-500">
              Şu anda profilinle eşleşen açık proje bulunamadı.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              {recommendations.map((project) => (
                <Link
                  key={project.projectId}
                  href={`/freelancers/discover/${project.projectId}`}
                  className="block rounded-xl border border-neutral-100 p-4 transition hover:border-neutral-300"
                >
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{project.title}</p>
                    <span className="text-sm font-medium text-green-600">
                      {project.matchScore}% match
                    </span>
                  </div>
                  <ul className="mt-2 space-y-1 text-sm text-neutral-600">
                    {project.reasons.map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      <Link
        href="/freelancers/proposals"
        className="inline-flex items-center gap-2 rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
      >
        Proposal assistance
        <ArrowRight size={14} />
      </Link>
    </div>
  );
}
