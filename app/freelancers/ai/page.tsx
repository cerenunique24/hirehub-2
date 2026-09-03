"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import type { ProfileAnalysis, ProjectRecommendation } from "@/types/ai";

export default function FreelancerAIPage() {
  const [profileAnalysis, setProfileAnalysis] = useState<ProfileAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<ProjectRecommendation[]>([]);

  useEffect(() => {
    async function load() {
      const [profileRes, projectsRes] = await Promise.all([
        fetch("/api/ai/analyze-profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: "Freelancer",
            bio: "UI/UX designer with product experience",
            skills: ["UI Design", "Figma", "UX Research"],
            portfolioCount: 2,
          }),
        }),
        fetch("/api/ai/recommend-projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ skills: ["UI Design", "Next.js", "React"] }),
        }),
      ]);

      const profileData = await profileRes.json();
      const projectsData = await projectsRes.json();

      setProfileAnalysis(profileData.analysis);
      setRecommendations(projectsData.recommendations ?? []);
    }

    load();
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

      {profileAnalysis && (
        <section className="rounded-3xl bg-white p-6 shadow-sm">
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

      <section className="rounded-3xl bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold">Recommended Projects</h2>
        <div className="mt-4 space-y-3">
          {recommendations.map((project) => (
            <div
              key={project.projectId}
              className="rounded-2xl border border-neutral-100 p-4"
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
            </div>
          ))}
        </div>
      </section>

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
