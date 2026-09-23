"use client";

import { Check } from "lucide-react";

type StepperProps = {
  step: number;
};

const steps = [
  "Temel Bilgiler",
  "Uzmanlık & Tercihler",
  "Profili Tamamla",
];

export default function Stepper({ step }: StepperProps) {
  return (
    <div className="mb-10 sm:mb-12">
      <div className="relative">
        {/* Arka plan çizgisi */}
        <div className="absolute left-[16.66%] right-[16.66%] top-5 h-px bg-gray-200" />

        {/* İlerleme çizgisi */}
        <div
          className="absolute left-[16.66%] top-5 h-px bg-[var(--color-primary-600)] transition-all duration-500"
          style={{
            width:
              step === 1
                ? "0%"
                : step === 2
                  ? "50%"
                  : "100%",
          }}
        />

        <div className="relative flex items-start justify-between">
          {steps.map((title, index) => {
            const current = index + 1;
            const completed = current < step;
            const active = current === step;

            return (
              <div
                key={title}
                className="flex flex-1 flex-col items-center"
              >
                {/* Numara / Check */}
                <div
                  className={`
                    relative z-10 flex h-10 w-10 items-center
                    justify-center rounded-full border
                    text-sm font-semibold transition-all duration-300
                    ${
                      completed
                        ? "border-[var(--color-primary-600)] bg-[var(--color-primary-600)] text-white"
                        : active
                          ? "border-[var(--color-primary-600)] bg-white text-[var(--color-text-primary)] ring-4 ring-gray-100"
                          : "border-gray-200 bg-white text-gray-400"
                    }
                  `}
                >
                  {completed ? (
                    <Check
                      size={17}
                      strokeWidth={2.8}
                    />
                  ) : (
                    current
                  )}
                </div>

                {/* Başlık */}
                <span
                  className={`
                    mt-3 max-w-[120px] text-center text-xs
                    leading-4 transition-colors duration-300 sm:max-w-none sm:text-sm
                    ${
                      completed || active
                        ? "font-semibold text-gray-950"
                        : "font-medium text-gray-400"
                    }
                  `}
                >
                  {title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* İlerleme bilgisi */}
      <div className="mt-5 text-center">
        <span className="text-xs font-medium text-gray-400">
          Adım {step} / 3
        </span>
      </div>
    </div>
  );
}