import { coalitions } from "@/mocks/coalitions";
import CoalitionCard from "@/components/coalition/CoalitionCard";

export default function ClientCoalitionsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-neutral-900">Coalitions</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Browse AI-scored coalitions. Formation always requires your approval.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {coalitions.map((coalition) => (
            <CoalitionCard key={coalition.id} coalition={coalition} />
          ))}
        </div>
      </div>
    </div>
  );
}
