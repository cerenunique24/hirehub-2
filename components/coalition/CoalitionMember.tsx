interface CoalitionMemberProps {
  name: string;
  role: string;
  isLeader?: boolean;
}

export default function CoalitionMember({
  name,
  role,
  isLeader = false,
}: CoalitionMemberProps) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-100 px-4 py-3">
      <div>
        <p className="font-medium text-neutral-900">{name}</p>
        <p className="text-sm text-neutral-500">{role}</p>
      </div>
      {isLeader && (
        <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-medium text-neutral-700">
          Lead
        </span>
      )}
    </div>
  );
}
