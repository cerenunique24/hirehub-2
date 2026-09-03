import type { Coalition } from "@/types/coalition";
import CoalitionScore from "./CoalitionScore";

interface CoalitionCardProps {
  coalition: Coalition;
}

export default function CoalitionCard({ coalition }: CoalitionCardProps) {
  return (
    <article className="rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">{coalition.name}</h2>
          <p className="mt-1 text-sm text-neutral-500">
            {coalition.members.length} members · {coalition.completedProjects} projects
          </p>
        </div>
        <CoalitionScore score={coalition.aiScore} />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {coalition.skills.map((skill) => (
          <span
            key={skill}
            className="rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-700"
          >
            {skill}
          </span>
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between text-sm">
        <span className="capitalize text-neutral-500">{coalition.availability}</span>
        <span className="font-medium text-neutral-900">{coalition.rating}/5 rating</span>
      </div>
    </article>
  );
}
