import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";
import clsx from "clsx";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, className, id, children, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={id}
          className={clsx(
            "w-full rounded-xl border bg-white px-4 py-2.5 text-sm outline-none transition-colors dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
            "focus:border-brand-500 focus:ring-2 focus:ring-brand-500/30",
            error ? "border-red-400 dark:border-red-500" : "border-slate-300",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";
