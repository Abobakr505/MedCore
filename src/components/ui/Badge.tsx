import clsx from "clsx";

const COLORS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
  blue: "bg-brand-50 text-brand-900 dark:bg-brand-500/15 dark:text-brand-200",
  green: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  red: "bg-red-50 text-red-600 dark:bg-red-500/15 dark:text-red-300",
  amber: "bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
};

export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: keyof typeof COLORS }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", COLORS[color])}>
      {children}
    </span>
  );
}
