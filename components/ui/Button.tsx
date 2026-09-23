import { forwardRef } from "react";
import type { ButtonHTMLAttributes } from "react";
import { Loader2 } from "lucide-react";

/**
 * CollaCrew Design System — Button
 * The single shared button implementation for the whole app.
 */

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "outline"
  | "danger"
  | "link";

export type ButtonSize = "sm" | "md" | "lg";

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary:
    "bg-[var(--color-primary-600)] text-white hover:bg-[var(--color-primary-700)] disabled:bg-[var(--color-primary-600)]/50",

  secondary:
    "bg-[var(--color-surface-1)] text-[var(--color-text-primary)] border border-[var(--color-border-subtle)] hover:border-[var(--color-primary-600)] hover:text-[var(--color-primary-600)] hover:bg-[var(--color-surface-1)] disabled:opacity-50",

  ghost:
    "bg-transparent text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)] disabled:opacity-50",

  outline:
    "bg-transparent text-[var(--color-primary-600)] border border-[var(--color-primary-600)] hover:bg-[var(--color-primary-50)] disabled:opacity-50",

  danger:
    "bg-[var(--color-error-600)] text-white hover:bg-[var(--color-error-600)]/90 disabled:bg-[var(--color-error-600)]/50",

  link:
    "bg-transparent text-[var(--color-primary-600)] hover:text-[var(--color-primary-700)] hover:underline px-0 h-auto disabled:opacity-50",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-[var(--button-height-sm)] px-[var(--button-padding-sm)]",
  md: "h-[var(--button-height-md)] px-[var(--button-padding-md)]",
  lg: "h-[var(--button-height-lg)] px-[var(--button-padding-lg)]",
};

const BASE_CLASSES = [
  "inline-flex items-center justify-center gap-[var(--button-gap)] whitespace-nowrap rounded-[var(--radius-button)] font-sans text-[length:var(--font-size-button)] font-medium leading-[var(--line-height-button)] transition-colors [&_svg]:shrink-0",
  "disabled:cursor-not-allowed",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-50)] focus-visible:ring-offset-1",
].join(" ");

/**
 * Button class string, for elements that must render as something other than
 * <button> (e.g. a Next.js <Link> CTA) but look exactly like a Button.
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  className = "",
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) {
  return [
    BASE_CLASSES,
    VARIANT_CLASSES[variant],
    variant === "link" ? "" : SIZE_CLASSES[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled,
      className = "",
      type = "button",
      children,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={buttonClasses({ variant, size, className })}
        {...props}
      >
        {loading && (
          <Loader2
            size={14}
            className="shrink-0 animate-spin"
            strokeWidth={1.7}
          />
        )}

        {children}
      </button>
    );
  }
);
