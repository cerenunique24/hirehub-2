import Link from "next/link";
import { users } from "@/mocks/users";

export default function TopFreelancers() {
  const freelancers = users.filter((u) => u.role === "freelancer");

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Top Freelancers</h2>
        <Link href="/client/freelancers" className="text-sm text-neutral-500 hover:text-black">
          Browse
        </Link>
      </div>

      <div className="space-y-3">
        {freelancers.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between rounded-xl border border-neutral-100 p-4"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold">
                {user.name.charAt(0)}
              </div>
              <div>
                <p className="font-medium text-neutral-900">
                  {user.name} {user.surname}
                </p>
                <p className="text-sm text-neutral-500">@{user.username}</p>
              </div>
            </div>
            <span className="text-sm font-medium text-green-600">92% match</span>
          </div>
        ))}
      </div>
    </div>
  );
}
