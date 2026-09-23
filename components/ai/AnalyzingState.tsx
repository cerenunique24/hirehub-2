"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";

const steps = [
  "Projenizi analiz ediyoruz",
  "Gerekli uzmanlıkları belirliyoruz",
  "Proje kapsamını oluşturuyoruz",
];

export default function AnalyzingState() {
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(8);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => Math.min(prev + 2, 92));
    }, 180);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => Math.min(prev + 1, steps.length - 1));
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-6">
      <div className="w-full max-w-xl">
        <div className="mb-8 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--color-primary-600)] text-white">
            <Sparkles size={28} />
          </div>
        </div>

        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold text-neutral-900">
            Projenizi analiz ediyoruz
          </h2>

          <p className="mt-2 text-sm text-neutral-500">
            Yapay zeka projeniz için gerekli uzmanlıkları çıkarıyor.
          </p>
        </div>

        <div className="mb-8 h-2 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className="h-full rounded-full bg-[var(--color-primary-600)] transition-all duration-300"
            style={{ width: progress + "%" }}
          ></div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const completed = index < currentStep;
            const active = index === currentStep;

            return (
              <div
                key={step}
                className={
                  "flex items-center gap-3 rounded-xl border px-4 py-3 transition-all duration-500 " +
                  (active
                    ? "border-neutral-200 bg-neutral-50"
                    : "border-transparent")
                }
              >
                <div className="flex h-7 w-7 shrink-0 items-center justify-center">
                  {completed ? (
                    <Check size={18} className="text-green-600" />
                  ) : active ? (
                    <Loader2
                      size={18}
                      className="animate-spin text-neutral-900"
                    />
                  ) : (
                    <div className="h-2 w-2 rounded-full bg-neutral-300"></div>
                  )}
                </div>

                <span
                  className={
                    "text-sm " +
                    (active
                      ? "font-medium text-neutral-900"
                      : completed
                        ? "text-neutral-500"
                        : "text-neutral-400")
                  }
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
