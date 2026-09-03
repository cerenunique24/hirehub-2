import Link from "next/link";
import { proposals } from "@/mocks/proposals";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function RecentProposals() {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-neutral-900">Recent Proposals</h2>
        <Link href="/client/proposals" className="text-sm text-neutral-500 hover:text-black">
          View all
        </Link>
      </div>

      <div className="space-y-3">
        {proposals.map((proposal) => (
          <div
            key={proposal.id}
            className="rounded-xl border border-neutral-100 p-4"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium text-neutral-900 capitalize">
                  {proposal.senderType} proposal
                </p>
                <p className="mt-1 line-clamp-2 text-sm text-neutral-500">
                  {proposal.coverLetter}
                </p>
              </div>
              <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                {proposal.status}
              </span>
            </div>
            <p className="mt-3 text-sm text-neutral-500">
              {formatCurrency(proposal.budget)} · {proposal.duration} days
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
