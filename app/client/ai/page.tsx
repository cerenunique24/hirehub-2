import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function ClientAIPage() {
  return (
    <div className="p-8">
      <div className="mx-auto max-w-4xl space-y-6">
        <div>
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-neutral-500">
            <Sparkles size={16} />
            CollaCrew AI
          </div>
          <h1 className="text-3xl font-bold text-neutral-900">Intelligence Layer</h1>
          <p className="mt-2 text-neutral-500">
            AI is integrated into your workflow — not a separate chatbot.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <AICard
            title="Create Project"
            description="Turn a brief into structured requirements, roles, and deliverables."
            href="/client/create-project"
          />
          <AICard
            title="Find Talent"
            description="Match freelancers and coalitions based on analyzed project needs."
            href="/client/freelancers"
          />
          <AICard
            title="Coalitions"
            description="Explore AI-scored teams. Coalition formation requires your approval."
            href="/client/coalitions"
          />
          <AICard
            title="Proposals"
            description="Review incoming proposals with project context."
            href="/client/proposals"
          />
        </div>
      </div>
    </div>
  );
}

function AICard({
  title,
  description,
  href,
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group rounded-3xl border border-neutral-200 bg-white p-6 shadow-sm transition hover:shadow-md"
    >
      <h2 className="text-lg font-semibold text-neutral-900">{title}</h2>
      <p className="mt-2 text-sm text-neutral-500">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-neutral-700 group-hover:text-black">
        Open
        <ArrowRight size={14} />
      </span>
    </Link>
  );
}
