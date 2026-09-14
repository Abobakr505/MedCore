import type { HTMLAttributes } from "react";
import clsx from "clsx";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={clsx(
        "rounded-[24px] border border-slate-200/80 bg-white/90 shadow-soft backdrop-blur-sm transition-all duration-200",
        className
      )}
      {...props}
    />
  );
}
