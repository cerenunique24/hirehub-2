"use client";

import type { ProjectAnalysis } from "@/types/ai";
import { Check, Clock3, Layers3, Sparkles, Users, Wallet } from "lucide-react";

interface ProjectAnalysisDisplayProps {
  title: string;
  analysis: ProjectAnalysis;
}

export default function ProjectAnalysisDisplay({
  title,
  analysis,
}: ProjectAnalysisDisplayProps) {
  return (
    <div className="space-y-5">
      <section className="rounded-3xl bg-white p-7 shadow-sm">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-sm text-neutral-400">Project</p>
            <h2 className="mt-1 text-2xl font-semibold text-neutral-900">
              {title || "Untitled Project"}
            </h2>
            <p className="mt-3 text-neutral-600">{analysis.summary}</p>
          </div>
          <div className="rounded-full bg-neutral-100 px-4 py-2 text-sm font-medium text-neutral-700">
            {analysis.category}
          </div>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <InfoBlock
          icon={<Layers3 size={18} />}
          title="Required expertise"
          items={analysis.requiredExpertise}
        />
        <InfoBlock
          icon={<Check size={18} />}
          title="Deliverables"
          items={analysis.deliverables}
        />
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <InfoBlock
          icon={<Layers3 size={18} />}
          title="Required roles"
          items={analysis.requiredRoles}
        />
        <InfoBlock
          icon={<Layers3 size={18} />}
          title="Required skills"
          items={analysis.requiredSkills}
        />
      </section>

      <section className="grid gap-5 md:grid-cols-4">
        <MetricCard icon={<Clock3 size={19} />} label="Estimated timeline" value={analysis.estimatedTimeline} />
        <MetricCard icon={<Wallet size={19} />} label="Budget" value={analysis.estimatedBudget || "Not specified"} />
        <MetricCard icon={<Layers3 size={19} />} label="Complexity" value={analysis.complexity} />
        <MetricCard icon={<Users size={19} />} label="Recommended crew" value={`${analysis.recommendedTeamSize} people`} />
      </section>

      <section className="rounded-3xl bg-neutral-900 p-7 text-white">
        <div className="flex gap-4">
          <Sparkles size={19} className="mt-1 shrink-0" />
          <div>
            <p className="text-sm font-medium text-neutral-400">AI INSIGHT</p>
            <p className="mt-2 leading-7 text-neutral-200">{analysis.insights}</p>
          </div>
        </div>
      </section>

      {analysis.considerations.length > 0 && (
        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <h3 className="mb-4 font-semibold text-neutral-900">Considerations</h3>
          <ul className="space-y-2 text-sm text-neutral-600">
            {analysis.considerations.map((item) => (
              <li key={item}>• {item}</li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function InfoBlock({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-3xl bg-white p-7 shadow-sm">
      <div className="mb-5 flex items-center gap-2">
        {icon}
        <h3 className="font-semibold">{title}</h3>
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className="rounded-full bg-neutral-100 px-3 py-2 text-sm text-neutral-700"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm">
      <div className="mb-4">{icon}</div>
      <p className="text-sm text-neutral-400">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
