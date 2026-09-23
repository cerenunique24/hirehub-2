"use client";

import type { TalentMatchingResult } from "@/types/ai";
import { Users, UsersRound } from "lucide-react";

interface TalentMatchingPanelProps {
  matching: TalentMatchingResult;
}

export default function TalentMatchingPanel({ matching }: TalentMatchingPanelProps) {
  return (
    <div className="space-y-6">
      <section className="rounded-xl bg-white p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <Users size={18} />
          <h3 className="font-semibold">Önerilen freelancerlar</h3>
        </div>
        <div className="space-y-4">
          {matching.recommendedFreelancers.map((freelancer) => (
            <div
              key={freelancer.userId}
              className="rounded-2xl border border-neutral-100 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-neutral-900">{freelancer.name}</p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-sm font-medium text-green-700">
                  %{freelancer.matchScore} eşleşme
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-neutral-600">
                {freelancer.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap gap-2">
                {freelancer.skills.map((skill) => (
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

      <section className="rounded-xl bg-white p-7 shadow-sm">
        <div className="mb-5 flex items-center gap-2">
          <UsersRound size={18} />
          <h3 className="font-semibold">Önerilen koalisyonlar</h3>
        </div>
        <div className="space-y-4">
          {matching.recommendedCoalitions.map((coalition) => (
            <div
              key={coalition.coalitionId}
              className="rounded-2xl border border-neutral-100 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium text-neutral-900">{coalition.name}</p>
                  <p className="text-sm text-neutral-500">
                    {coalition.memberCount} aktif üye
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
                  %{coalition.matchScore} eşleşme
                </span>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-neutral-600">
                {coalition.reasons.map((reason) => (
                  <li key={reason}>• {reason}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
