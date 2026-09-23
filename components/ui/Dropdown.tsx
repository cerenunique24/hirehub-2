"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

/** CollaCrew Design System — Dropdown. Shared trigger + floating panel primitive. */
export function Dropdown({
  trigger,
  children,
  align = "end",
  className = "",
}: {
  trigger: (props: { open: boolean; toggle: () => void }) => ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onClickOutside(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      {trigger({ open, toggle: () => setOpen((v) => !v) })}

      {open && (
        <div
          className={[
            "absolute z-50 mt-1.5 min-w-[220px] overflow-hidden rounded-[var(--radius-menu)] border border-[var(--color-border-subtle)] bg-[var(--color-surface-1)] p-1 shadow-[var(--shadow-lg)]",
            align === "end" ? "right-0" : "left-0",
            className,
          ].join(" ")}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  danger = false,
}: {
  children: ReactNode;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "flex h-[var(--control-height-sm)] w-full items-center gap-2 rounded-[var(--radius-xs)] px-2.5 text-left font-sans text-[length:var(--font-size-body-sm)] leading-5 transition-colors",
        danger
          ? "text-[var(--color-error-600)] hover:bg-[var(--color-error-50)]"
          : "text-[var(--color-text-primary)] hover:bg-[var(--color-surface-2)]",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

export default Dropdown;
