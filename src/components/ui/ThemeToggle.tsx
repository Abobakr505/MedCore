import { motion, AnimatePresence } from "framer-motion";
import { Moon, Sun } from "lucide-react";
import clsx from "clsx";

import { DARK_MODE_ENABLED, useTheme } from "@/contexts/ThemeContext";

interface ThemeToggleProps {
  variant?: "icon" | "switch";
  className?: string;
}

export function ThemeToggle({
  variant = "icon",
  className,
}: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme();

  if (!DARK_MODE_ENABLED) return null;

  const label = isDark ? "التبديل للوضع الفاتح" : "التبديل للوضع الداكن";

  /* ================= SWITCH ================= */

  if (variant === "switch") {
    return (
      <button
        type="button"
        onClick={toggleTheme}
        role="switch"
        aria-checked={isDark}
        aria-label={label}
        className={clsx(
          "group flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-300 dark:hover:bg-slate-800",
          className
        )}
      >
        <span className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-white text-amber-500 shadow-sm dark:bg-slate-900 dark:text-brand-300">
            {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </span>
          {isDark ? "الوضع الداكن" : "الوضع الفاتح"}
        </span>

        {/* dir=ltr عشان حركة الـ knob تبقى ثابتة في الـ RTL */}
        <span
          dir="ltr"
          className={clsx(
            "relative h-7 w-[52px] shrink-0 rounded-full p-0.5 transition-colors duration-300",
            isDark
              ? "bg-gradient-to-r from-brand-600 to-brand-500"
              : "bg-slate-300"
          )}
        >
          <motion.span
            animate={{ x: isDark ? 24 : 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
            className="grid h-6 w-6 place-items-center rounded-full bg-white shadow-md"
          >
            <AnimatePresence mode="wait" initial={false}>
              {isDark ? (
                <motion.span
                  key="moon"
                  initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                >
                  <Moon className="h-3.5 w-3.5 text-brand-600" />
                </motion.span>
              ) : (
                <motion.span
                  key="sun"
                  initial={{ rotate: 90, opacity: 0, scale: 0.5 }}
                  animate={{ rotate: 0, opacity: 1, scale: 1 }}
                  exit={{ rotate: -90, opacity: 0, scale: 0.5 }}
                  transition={{ duration: 0.15 }}
                >
                  <Sun className="h-3.5 w-3.5 text-amber-500" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.span>
        </span>
      </button>
    );
  }

  /* ================= ICON ================= */

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      title={label}
      className={clsx(
        "relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-amber-500 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-300",
        className
      )}
    >
      <AnimatePresence mode="wait" initial={false}>
        {isDark ? (
          <motion.span
            key="moon"
            initial={{ y: 18, rotate: -60, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -18, rotate: 60, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Moon className="h-[18px] w-[18px]" />
          </motion.span>
        ) : (
          <motion.span
            key="sun"
            initial={{ y: 18, rotate: 60, opacity: 0 }}
            animate={{ y: 0, rotate: 0, opacity: 1 }}
            exit={{ y: -18, rotate: -60, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Sun className="h-[18px] w-[18px]" />
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}