import * as React from "react";

type Option = {
  label: string;
  value: string;
};

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  error?: string;
  options: Option[];
};

/** CollaCrew Design System — Select. */
const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, options, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="cc-label mb-[var(--rhythm-label-gap)] block text-[var(--color-text-primary)]">
            {label}
          </label>
        )}

        <select
          ref={ref}
          className={[
            "h-[var(--input-height)] w-full rounded-[var(--radius-input)] border bg-[var(--color-surface-1)] px-[var(--input-padding-x)] font-sans text-[length:var(--font-size-body)] leading-5 text-[var(--color-text-primary)] outline-none transition disabled:cursor-not-allowed disabled:bg-[var(--color-surface-2)] disabled:opacity-60",
            error
              ? "border-[var(--color-error-600)] bg-[var(--color-error-50)] focus:border-[var(--color-error-600)] focus:ring-2 focus:ring-[var(--color-error-50)]"
              : "border-[var(--color-border-subtle)] focus:border-[var(--color-primary-600)] focus:ring-2 focus:ring-[var(--color-primary-50)]",
            className,
          ].join(" ")}
          {...props}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {error && <p className="cc-body-sm mt-[var(--rhythm-label-gap)] text-[var(--color-error-600)]">{error}</p>}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
