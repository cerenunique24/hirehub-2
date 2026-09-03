import Link from "next/link";
import { notFound } from "next/navigation";
import { projects } from "@/mocks/projects";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default async function ClientProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const project = projects.find((item) => item.id === id);

  if (!project) {
    notFound();
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/client/projects" className="text-sm text-neutral-500 hover:text-black">
          ← Back to projects
        </Link>

        <div className="rounded-3xl bg-white p-8 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-neutral-900">{project.title}</h1>
              <p className="mt-3 text-neutral-600">{project.description}</p>
            </div>
            <span className="rounded-full bg-neutral-100 px-3 py-1 text-sm capitalize">
              {project.status}
            </span>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Budget</p>
              <p className="mt-1 font-semibold">{formatCurrency(project.budget)}</p>
            </div>
            <div className="rounded-2xl bg-neutral-50 p-4">
              <p className="text-sm text-neutral-500">Recommendation</p>
              <p className="mt-1 font-semibold capitalize">{project.recommendation}</p>
            </div>
          </div>

          <div className="mt-6">
            <p className="mb-3 text-sm font-medium text-neutral-700">Required skills</p>
            <div className="flex flex-wrap gap-2">
              {project.requiredSkills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-neutral-100 px-3 py-1 text-sm text-neutral-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
