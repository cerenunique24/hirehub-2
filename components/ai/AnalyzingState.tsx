"use client";

import { Check, Sparkles } from "lucide-react";

const steps = [
  "Understanding your project",
  "Identifying required expertise",
  "Defining project scope",
];

export default function AnalyzingState() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-3xl items-center justify-center">
      <div className="w-full rounded-3xl bg-white p-10 text-center shadow-sm md:p-14">
        <div className="mx-auto mb-8 flex h-16 w-16 items-center justify-center rounded-2xl bg-black text-white">
          <Sparkles size={28} />
        </div>

        <p className="mb-3 text-sm font-medium text-neutral-400">COLLACREW AI</p>

        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">
          Understanding your project
        </h1>

        <p className="mx-auto mt-4 max-w-md text-neutral-500">
          We are identifying the skills, scope and expertise your project needs.
        </p>

        <div className="mx-auto mt-10 max-w-sm space-y-3 text-left">
          {steps.map((item, index) => (
            <div
              key={item}
              className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white">
                {index === 0 ? (
                  <Check size={15} />
                ) : (
                  <Sparkles size={14} className="text-neutral-400" />
                )}
              </div>
              <span className="text-sm text-neutral-700">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
