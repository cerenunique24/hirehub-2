"use client";

import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
}

export default function StatCard({
  title,
  value,
  subtitle,
  change,
}: StatCardProps) {
  const positive = (change ?? 0) >= 0;

  return (
    <div className="rounded-xl border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-5 transition hover:border-[var(--color-border-strong)] hover:shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-[var(--color-text-secondary)]">{title}</p>

          <h3 className="mt-3 text-3xl font-semibold text-[var(--color-text-primary)]">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
              {subtitle}
            </p>
          )}
        </div>

        {change !== undefined && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              positive
                ? "bg-[var(--color-success-50)] text-[var(--color-success-600)]"
                : "bg-[var(--color-error-50)] text-[var(--color-error-600)]"
            }`}
          >
            {positive ? (
              <ArrowUpRight size={14} />
            ) : (
              <ArrowDownRight size={14} />
            )}

            {Math.abs(change)}%
          </div>
        )}
      </div>
    </div>
  );
}