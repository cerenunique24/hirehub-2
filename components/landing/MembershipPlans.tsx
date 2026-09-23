"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { FREELANCER_PLANS, CLIENT_PLANS } from "@/lib/plans";
import { Reveal } from "./Reveal";

export default function MembershipPlans() {
  const [role, setRole] = useState<"freelancer" | "client">("freelancer");
  const plans = role === "freelancer" ? FREELANCER_PLANS : CLIENT_PLANS;

  return (
    <>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="max-w-xl">
          <p className="text-[13px] font-medium text-[var(--color-primary-600)]">Üyelikler</p>
          <h2 className="mt-3 text-[28px] font-semibold leading-[1.15] tracking-[-0.025em] text-[var(--color-text-primary)] sm:text-4xl">
            İhtiyacına uygun üyelik planını seç
          </h2>
          <p className="mt-3 text-[15px] leading-6 text-[var(--color-text-secondary)]">
            Ücretsiz başla, ihtiyaçların büyüdükçe daha gelişmiş AI özelliklerinin kilidini aç.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Plan türü"
          className="inline-flex shrink-0 self-start rounded-[var(--radius-md)] border border-[var(--color-border-subtle)] bg-white p-0.5 sm:self-auto"
        >
          {(
            [
              { value: "freelancer", label: "Freelancer" },
              { value: "client", label: "Proje Sahibi" },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              role="tab"
              aria-selected={role === item.value}
              onClick={() => setRole(item.value)}
              className={`cc-tab-text h-8 rounded-[var(--radius-tab)] px-3 transition-colors ${
                role === item.value
                  ? "bg-[var(--color-text-primary)] text-white"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-px overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-subtle)] bg-[var(--color-border-subtle)] md:grid-cols-3">
        {plans.map((plan, index) => (
          <Reveal key={`${role}-${plan.id}`} variant="up" delay={index * 90} className="bg-white p-6">
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-semibold text-[var(--color-text-primary)]">{plan.name}</h3>
              {plan.recommended && (
                <span className="rounded-[var(--radius-pill)] bg-[var(--color-primary-50)] px-2 py-0.5 text-xs font-medium text-[var(--color-primary-700)]">
                  Önerilen
                </span>
              )}
            </div>

            <p className="mt-3 text-[28px] font-semibold tracking-[-0.02em] text-[var(--color-text-primary)]">
              {plan.priceMonthly === 0 ? "Ücretsiz" : `₺${plan.priceMonthly}`}
              {plan.priceMonthly > 0 && (
                <span className="ml-1 text-sm font-normal tracking-normal text-[var(--color-text-muted)]">/ay</span>
              )}
            </p>

            <ul className="mt-5 space-y-2.5 border-t border-[var(--color-border-subtle)] pt-5 text-sm text-[var(--color-text-secondary)]">
              {plan.addedFeatures.map((feature) => (
                <li key={feature} className="flex items-start gap-2">
                  <Check size={15} className="mt-0.5 shrink-0 text-[var(--color-primary-600)]" />
                  {feature}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      <p className="mt-6 text-center text-[13px] text-[var(--color-text-muted)]">
        Free planda temel AI proje analizi ve temel eşleşme her zaman ücretsizdir.
      </p>
    </>
  );
}
