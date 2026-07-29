import * as React from "react";

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  error?: string;
};

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="mb-2 block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}

        <textarea
          ref={ref}
          className={`
            min-h-[120px]
            w-full
            rounded-xl
            border
            border-gray-300
            bg-white
            px-4
            py-3
            text-gray-900
            placeholder:text-gray-400
            outline-none
            transition
            duration-200
            focus:border-black
            focus:ring-2
            focus:ring-black/10
            disabled:cursor-not-allowed
            disabled:bg-gray-100
            resize-none
            ${className}
          `}
          {...props}
        />

        {error && (
          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

export default Textarea;