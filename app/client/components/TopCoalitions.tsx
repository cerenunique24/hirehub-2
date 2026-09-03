import Link from "next/link";
import { coalitions } from "@/mocks/coalitions";

export default function TopCoalitions() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Top Coalitions</h2>
        <Link href="/client/coalitions" className="text-sm text-neutral-500 hover:text-black">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {coalitions.map((coalition) => (
          <div
            key={coalition.id}
            className="rounded-xl border border-neutral-100 p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-neutral-900">{coalition.name}</p>
                <p className="mt-1 text-sm text-neutral-500">
                  {coalition.members.length} members · {coalition.completedProjects} projects
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-neutral-900">
                  {coalition.aiScore}% AI score
                </p>
                <p className="text-xs text-neutral-500">{coalition.rating}/5 rating</p>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {coalition.skills.slice(0, 3).map((skill) => (
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
    </div>
  );
}
