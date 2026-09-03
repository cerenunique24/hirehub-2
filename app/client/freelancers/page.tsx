import { users } from "@/mocks/users";

export default function ClientFreelancersPage() {
  const freelancers = users.filter((user) => user.role === "freelancer");

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Freelancers</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Discover talent matched to your project requirements.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {freelancers.map((user) => (
            <div
              key={user.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-lg font-semibold">
                  {user.name.charAt(0)}
                </div>
                <div>
                  <h2 className="font-semibold text-neutral-900">
                    {user.name} {user.surname}
                  </h2>
                  <p className="text-sm text-neutral-500">
                    {user.city}, {user.country}
                  </p>
                </div>
              </div>
              <p className="mt-4 text-sm text-neutral-600">
                CollaCrew match intelligence available after project analysis.
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
