import Link from "next/link";
import { projects } from "@/mocks/projects";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function ClientProjectsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-neutral-900">Projects</h1>
            <p className="mt-1 text-sm text-neutral-500">
              Manage drafts, published projects, and active work.
            </p>
          </div>
          <Link
            href="/client/create-project"
            className="rounded-full bg-black px-5 py-2.5 text-sm font-medium text-white"
          >
            Create Project
          </Link>
        </div>

        <div className="grid gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/client/projects/${project.id}`}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold text-neutral-900">
                    {project.title}
                  </h2>
                  <p className="mt-2 text-neutral-500">{project.description}</p>
                </div>
                <span className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-medium capitalize">
                  {project.status}
                </span>
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                {formatCurrency(project.budget)} · {project.requiredSkills.join(", ")}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
