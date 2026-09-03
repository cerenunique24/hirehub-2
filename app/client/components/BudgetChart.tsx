export default function BudgetChart() {
  const segments = [
    { label: "Active", value: 45, color: "bg-black" },
    { label: "Reserved", value: 30, color: "bg-neutral-400" },
    { label: "Available", value: 25, color: "bg-neutral-200" },
  ];

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <h2 className="mb-2 text-lg font-semibold text-neutral-900">Budget Allocation</h2>
      <p className="mb-6 text-sm text-neutral-500">Current project spend overview</p>

      <div className="mb-6 flex h-4 overflow-hidden rounded-full bg-neutral-100">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={`${segment.color} h-full`}
            style={{ width: `${segment.value}%` }}
          />
        ))}
      </div>

      <div className="space-y-3">
        {segments.map((segment) => (
          <div key={segment.label} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={`h-3 w-3 rounded-full ${segment.color}`} />
              <span className="text-neutral-600">{segment.label}</span>
            </div>
            <span className="font-medium text-neutral-900">{segment.value}%</span>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-neutral-50 p-4">
        <p className="text-sm text-neutral-500">Total allocated</p>
        <p className="mt-1 text-2xl font-bold text-neutral-900">₺182,000</p>
      </div>
    </div>
  );
}
