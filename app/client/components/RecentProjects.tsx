import Link from "next/link";
import { projects } from "@/mocks/projects";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function RecentProjects() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Recent Projects</h2>
        <Link href="/client/projects" className="text-sm text-neutral-500 hover:text-black">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {projects.map((project) => (
          <Link
            key={project.id}
            href={`/client/projects/${project.id}`}
            className="block rounded-xl border border-neutral-100 p-4 transition hover:bg-neutral-50"
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-medium text-neutral-900">{project.title}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {formatCurrency(project.budget)} · {project.requiredSkills.length} skills
                </p>
              </div>
              <span className="text-xs capitalize text-neutral-400">
                {project.status}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
