"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

/** CollaCrew Design System — Modal. Shared dialog shell for both panels. */
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  const sizeClasses = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl" }[size];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--color-text-primary)]/40"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? "modal-title" : undefined}
        className={[
          "relative w-full rounded-[var(--radius-modal)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-6 shadow-xl",
          sizeClasses,
        ].join(" ")}
      >
        {(title || description) && (
          <div className="mb-[var(--rhythm-section-title-gap)] pr-8">
            {title && (
              <h2 id="modal-title" className="cc-h2 text-[var(--color-text-primary)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="cc-body-sm mt-[var(--rhythm-title-gap)] text-[var(--color-text-secondary)]">{description}</p>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-[var(--radius-button)] text-[var(--color-text-secondary)] transition hover:bg-[var(--color-surface-2)] hover:text-[var(--color-text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-50)]"
        >
          <X size={18} strokeWidth={1.8} />
        </button>

        {children}

        {footer && <div className="mt-6 flex items-center justify-end gap-2">{footer}</div>}
      </div>
    </div>
  );
}

export default Modal;
