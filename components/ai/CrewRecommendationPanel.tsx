"use client";

import type { CrewRecommendation } from "@/types/ai";
import { Sparkles, Users } from "lucide-react";

interface CrewRecommendationPanelProps {
  crew: CrewRecommendation;
}

export default function CrewRecommendationPanel({ crew }: CrewRecommendationPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-3xl bg-neutral-900 p-7 text-white">
        <div className="flex gap-4">
          <Sparkles size={19} className="mt-1 shrink-0" />
          <div>
            <p className="text-sm font-medium text-neutral-400">AI CREW RECOMMENDATION</p>
            <p className="mt-2 leading-7 text-neutral-200">{crew.summary}</p>
            <p className="mt-4 text-sm text-neutral-400">
              Confidence: {crew.confidence}% · {crew.estimatedDuration} · {crew.totalEstimatedCost}
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl bg-white p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Users size={18} />
          <h3 className="font-semibold">Suggested Crew</h3>
        </div>
        <div className="space-y-4">
          {crew.members.map((member, index) => (
            <div
              key={`${member.role}-${index}`}
              className="rounded-2xl border border-neutral-100 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-neutral-900">{member.name}</p>
                  <p className="text-sm text-neutral-500">{member.role}</p>
                </div>
              </div>
              <p className="mt-2 text-sm text-neutral-600">{member.reason}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {member.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs text-neutral-600"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Review this crew recommendation before publishing. You can go back to edit roles and skills, or approve to continue.
      </p>
    </div>
  );
}
