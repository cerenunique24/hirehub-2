import { proposals } from "@/mocks/proposals";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function ClientProposalsPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-3xl font-bold text-neutral-900">Proposals</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Review incoming proposals from freelancers and coalitions.
        </p>

        <div className="mt-8 space-y-4">
          {proposals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold capitalize text-neutral-900">
                    {proposal.senderType} proposal
                  </p>
                  <p className="mt-2 text-neutral-600">{proposal.coverLetter}</p>
                </div>
                <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                  {proposal.status}
                </span>
              </div>
              <p className="mt-4 text-sm text-neutral-500">
                {formatCurrency(proposal.budget)} · {proposal.duration} days
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
