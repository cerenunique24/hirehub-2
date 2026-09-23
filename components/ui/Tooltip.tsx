"use client";

import { useState, type ReactNode } from "react";

/** CollaCrew Design System — Tooltip. Hover-triggered label anchored to its child. */
export function Tooltip({
  label,
  children,
  side = "right",
  disabled = false,
}: {
  label: string;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  disabled?: boolean;
}) {
  const [visible, setVisible] = useState(false);

  const positionClasses: Record<typeof side, string> = {
    top: "bottom-[calc(100%+8px)] left-1/2 -translate-x-1/2",
    right: "left-[calc(100%+10px)] top-1/2 -translate-y-1/2",
    bottom: "top-[calc(100%+8px)] left-1/2 -translate-x-1/2",
    left: "right-[calc(100%+10px)] top-1/2 -translate-y-1/2",
  };

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}

      {!disabled && (
        <span
          role="tooltip"
          className={[
            "pointer-events-none absolute z-50 whitespace-nowrap rounded-[var(--radius-sm)] bg-[var(--color-text-primary)] px-2 py-1 text-xs font-medium text-white shadow-lg transition-opacity",
            positionClasses[side],
            visible ? "opacity-100" : "opacity-0",
          ].join(" ")}
        >
          {label}
        </span>
      )}
    </span>
  );
}

export default Tooltip;
