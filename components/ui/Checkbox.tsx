"use client";

import * as React from "react";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  description?: string;
};

/** CollaCrew Design System — Checkbox. */
const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = "", ...props }, ref) => {
    return (
      <label className="flex cursor-pointer items-start gap-3">
        <input
          ref={ref}
          type="checkbox"
          className={[
            "mt-0.5 h-4 w-4 rounded border-[var(--color-border-strong)] text-[var(--color-primary-600)] accent-[var(--color-primary-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary-50)]",
            className,
          ].join(" ")}
          {...props}
        />

        {(label || description) && (
          <div>
            {label && (
              <p className="text-sm font-medium text-[var(--color-text-primary)]">{label}</p>
            )}

            {description && (
              <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{description}</p>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
