import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";
import clsx from "clsx";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={id}
          className={clsx(
            "w-full rounded-xl border px-4 py-2.5 text-sm outline-none transition-colors",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30 dark:placeholder:text-slate-500",
            error ? "border-red-400 dark:border-red-500" : "border-slate-300 dark:border-slate-700",
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";
