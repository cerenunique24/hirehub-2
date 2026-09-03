import { projects } from "@/mocks/projects";

export default function ProjectOverview() {
  const active = projects.filter((p) => p.status !== "completed");

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Project Overview</h2>
        <span className="text-sm text-neutral-500">{active.length} active</span>
      </div>

      <div className="space-y-4">
        {active.map((project) => (
          <div
            key={project.id}
            className="rounded-xl border border-neutral-100 bg-neutral-50 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-medium text-neutral-900">{project.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                  {project.description}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-white px-3 py-1 text-xs font-medium capitalize text-neutral-600">
                {project.status.replace("_", " ")}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.requiredSkills.slice(0, 3).map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-white px-2.5 py-1 text-xs text-neutral-600"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
