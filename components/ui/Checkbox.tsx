"use client";

import * as React from "react";

type CheckboxProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  description?: string;
};

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = "", ...props }, ref) => {
    return (
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          ref={ref}
          type="checkbox"
          className={`
            mt-1
            h-5
            w-5
            rounded
            border-gray-300
            accent-black
            ${className}
          `}
          {...props}
        />

        <div>
          {label && (
            <p className="text-sm font-medium text-gray-900">
              {label}
            </p>
          )}

          {description && (
            <p className="text-sm text-gray-500 mt-1">
              {description}
            </p>
          )}
        </div>
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;