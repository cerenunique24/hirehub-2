import { forwardRef } from "react";
import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

/** CollaCrew Design System — Input / Textarea. */
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  hasError?: boolean;
}

const BASE =
  "w-full min-h-[var(--input-height)] rounded-[var(--radius-input)] border bg-[var(--color-surface-1)] px-[var(--input-padding-x)] font-sans text-[length:var(--font-size-body)] leading-5 text-[var(--color-text-primary)] outline-none transition placeholder:text-[var(--color-text-muted)] disabled:cursor-not-allowed disabled:bg-[var(--color-surface-2)] disabled:opacity-60";

const BORDER = "border-[var(--color-border-subtle)] focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[var(--color-primary-50)]";

const BORDER_ERROR =
  "border-[var(--color-error-600)] bg-[var(--color-error-50)] focus:border-[var(--color-error-600)] focus:ring-2 focus:ring-[var(--color-error-50)]";

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { hasError, className = "", ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={[BASE, hasError ? BORDER_ERROR : BORDER, className].join(" ")}
      {...props}
    />
  );
});

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { hasError, className = "", ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      className={[BASE, "min-h-[7rem] resize-none py-2 leading-[var(--line-height-body)]", hasError ? BORDER_ERROR : BORDER, className].join(" ")}
      {...props}
    />
  );
});
