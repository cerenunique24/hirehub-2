import { pageHeaderClass } from "@/components/ui/PageHeader";
export default function ClientInvitationsPage() {
  return (
    <div className="w-full">
      <div className={pageHeaderClass}>
        <h1 className="cc-page-title font-semibold text-[var(--color-text-primary)]">Invitations</h1>
        <p className="mt-2 text-[var(--color-text-secondary)]">
          Send and manage invitations to freelancers and coalitions.
        </p>
        <p className="mt-8 text-sm text-[var(--color-text-muted)]">
          No pending invitations. Invitations appear here after you publish a project.
        </p>
      </div>
    </div>
  );
}
