"use client";

import Image from "next/image";
import Link from "next/link";
import { Check, Eye, EyeOff } from "lucide-react";
import type { ReactNode } from "react";
import { Input } from "@/components/ui/Input";

/**
 * CollaCrew — Register split layout.
 *
 * Freelancer ve Client kayıt ekranlarının ortak iskeleti. Login ekranıyla
 * aynı görsel mantık: solda görsel + hero metni, sağda form.
 *
 * Desktop (lg+): iki kolon 50/50, sayfa viewport'a sabit. Sol panel hiç
 * kaymaz; uzun formlarda yalnızca sağ panel kendi içinde scroll eder.
 * Mobil: sol panel gizli, sayfa doğal dikey scroll kullanır.
 */
export function RegisterSplitLayout({
  image,
  eyebrow,
  title,
  description,
  highlights,
  children,
}: {
  image: string;
  eyebrow: string;
  title: string;
  description: string;
  highlights?: string[];
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-[var(--color-surface-1)] lg:grid lg:h-screen lg:grid-cols-2 lg:overflow-hidden">
      {/* Sol panel — viewport'a sabit */}
      <aside className="relative hidden overflow-hidden lg:block lg:h-screen">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-black/25" />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black/95 via-black/70 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent" />

        <div className="absolute inset-x-0 top-0 p-8">
          <Link href="/" className="inline-flex items-center transition hover:opacity-90" aria-label="CollaCrew anasayfa">
            <Image
              src="/logo-white.png"
              alt="CollaCrew"
              width={126}
              height={24}
              priority
              className="h-auto w-[126px] drop-shadow-[0_1px_2px_rgb(0_0_0_/_0.35)]"
            />
          </Link>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-10">
          <div className="max-w-md [text-shadow:0_1px_3px_rgb(0_0_0_/_0.8),0_2px_16px_rgb(0_0_0_/_0.6)]">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#9DB4F7]">{eyebrow}</p>

            <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-[-0.02em] text-white">{title}</h2>

            <p className="mt-3 text-white/90">{description}</p>

            {highlights && highlights.length > 0 && (
              <ul className="mt-6 space-y-2.5">
                {highlights.map((item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm text-white/90">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/15 text-white">
                      <Check size={12} strokeWidth={2} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>

      {/* Sağ panel — desktop'ta bağımsız scroll */}
      <section className="lg:h-screen lg:overflow-y-auto">
        <div className="mx-auto w-full max-w-md px-6 py-8 sm:px-0 sm:py-10 lg:py-16">
          <Link href="/" className="mb-8 inline-flex items-center lg:hidden" aria-label="CollaCrew anasayfa">
            <Image src="/logo.png" alt="CollaCrew" width={126} height={24} priority className="h-auto w-[126px]" />
          </Link>

          {children}
        </div>
      </section>
    </main>
  );
}

/** Adım göstergesi + başlık + açıklama. */
export function RegisterFormHeader({
  step,
  totalSteps,
  stepLabel,
  title,
  description,
}: {
  step: number;
  totalSteps: number;
  stepLabel: string;
  title: string;
  description: string;
}) {
  return (
    <header className="mb-[var(--space-6)]">
      <div className="mb-2 flex items-center justify-between text-xs font-medium text-[var(--color-text-muted)]">
        <span>
          Adım {step} / {totalSteps}
        </span>
        <span>{stepLabel}</span>
      </div>

      <div className="h-1 overflow-hidden rounded-[var(--radius-pill)] bg-[var(--color-surface-2)]">
        <div
          className="h-full rounded-[var(--radius-pill)] bg-[var(--color-primary-600)]"
          style={{ width: `${(step / totalSteps) * 100}%` }}
        />
      </div>

      <h1 className="cc-page-title mt-[var(--space-6)] text-[var(--color-text-primary)]">{title}</h1>

      <p className="cc-body mt-[var(--rhythm-title-gap)] text-[var(--color-text-secondary)]">{description}</p>
    </header>
  );
}

/** Label + kontrol + opsiyonel yardım/hata metni. */
export function RegisterField({
  label,
  htmlFor,
  hint,
  hintTone = "muted",
  children,
}: {
  label: string;
  htmlFor?: string;
  hint?: ReactNode;
  hintTone?: "muted" | "success" | "error";
  children: ReactNode;
}) {
  const hintColor =
    hintTone === "success"
      ? "text-[var(--color-success-600)]"
      : hintTone === "error"
        ? "text-[var(--color-error-600)]"
        : "text-[var(--color-text-muted)]";

  return (
    <div>
      <label htmlFor={htmlFor} className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-primary)]">
        {label}
      </label>
      {children}
      {hint && <p className={`mt-1.5 text-xs ${hintColor}`}>{hint}</p>}
    </div>
  );
}

/** Göster/gizle butonlu şifre alanı — shared Input üzerine kurulu. */
export function PasswordInput({
  visible,
  onToggle,
  ...props
}: React.ComponentProps<typeof Input> & {
  visible: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="relative">
      <Input {...props} type={visible ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={onToggle}
        aria-label={visible ? "Şifreyi gizle" : "Şifreyi göster"}
        className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-muted)] transition hover:text-[var(--color-text-primary)]"
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}

/** Şifre kuralları listesi. */
export function PasswordChecklist({ rules }: { rules: { label: string; valid: boolean }[] }) {
  return (
    <div className="mt-2 grid gap-1.5 rounded-[var(--radius-input)] bg-[var(--color-surface-2)]/60 px-3 py-2.5 sm:grid-cols-2">
      {rules.map((rule) => (
        <div
          key={rule.label}
          className={`flex items-center gap-2 text-xs ${
            rule.valid ? "text-[var(--color-success-600)]" : "text-[var(--color-text-secondary)]"
          }`}
        >
          <span
            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[var(--radius-pill)] ${
              rule.valid ? "bg-[var(--color-success-50)]" : "bg-white"
            }`}
          >
            {rule.valid && <Check size={11} />}
          </span>
          {rule.label}
        </div>
      ))}
    </div>
  );
}

/** KVKK + Kullanım Koşulları onay kutusu grubu. */
export function ConsentGroup({
  kvkk,
  terms,
  onKvkkChange,
  onTermsChange,
  onOpenDocument,
}: {
  kvkk: boolean;
  terms: boolean;
  onKvkkChange: (value: boolean) => void;
  onTermsChange: (value: boolean) => void;
  onOpenDocument: (doc: "kvkk" | "terms") => void;
}) {
  const linkClass =
    "font-medium text-[var(--color-text-primary)] underline underline-offset-2 transition hover:text-[var(--color-primary-600)]";

  return (
    <div className="space-y-2.5 rounded-[var(--radius-card)] border border-[var(--color-border-subtle)] p-3.5">
      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={kvkk}
          onChange={(e) => onKvkkChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-primary-600)]"
        />
        <span className="cc-body-sm text-[var(--color-text-secondary)]">
          <button type="button" onClick={() => onOpenDocument("kvkk")} className={linkClass}>
            KVKK Aydınlatma Metni
          </button>
          &apos;ni okudum ve anladım.
        </span>
      </label>

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={terms}
          onChange={(e) => onTermsChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-[var(--color-primary-600)]"
        />
        <span className="cc-body-sm text-[var(--color-text-secondary)]">
          CollaCrew{" "}
          <button type="button" onClick={() => onOpenDocument("terms")} className={linkClass}>
            Kullanım Koşulları
          </button>
          &apos;nı kabul ediyorum.
        </span>
      </label>
    </div>
  );
}

export default RegisterSplitLayout;
