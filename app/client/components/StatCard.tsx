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
    <div className="group rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-neutral-500">{title}</p>

          <h3 className="mt-3 text-3xl font-bold text-neutral-900">
            {value}
          </h3>

          {subtitle && (
            <p className="mt-2 text-sm text-neutral-500">
              {subtitle}
            </p>
          )}
        </div>

        {change !== undefined && (
          <div
            className={`flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
              positive
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
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