import clsx from "clsx";

const COLORS: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700",
  blue: "bg-brand-50 text-brand-900",
  green: "bg-emerald-50 text-emerald-700",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-700",
};

export function Badge({ children, color = "slate" }: { children: React.ReactNode; color?: keyof typeof COLORS }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", COLORS[color])}>
      {children}
    </span>
  );
}
