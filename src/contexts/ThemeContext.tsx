import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "medcore-theme";

interface ThemeContextValue {
  theme: Theme;
  isDark: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readSaved(): Theme | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : null;
  } catch {
    return null;
  }
}

function getSystemTheme(): Theme {
  return typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function applyTheme(theme: Theme, animate = false) {
  const root = document.documentElement;

  if (animate) {
    root.classList.add("theme-transition");
    if (themeTransitionTimeout !== undefined) {
      window.clearTimeout(themeTransitionTimeout);
    }
    themeTransitionTimeout = window.setTimeout(() => {
      root.classList.remove("theme-transition");
      themeTransitionTimeout = undefined;
    }, 400);
  }

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;

  const meta = document.querySelector('meta[name="theme-color"]');
  meta?.setAttribute("content", theme === "dark" ? "#020617" : "#ffffff");
}

let themeTransitionTimeout: number | undefined;

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(
    () => readSaved() ?? getSystemTheme()
  );

  // هل المستخدم اختار الثيم بنفسه؟ لو لأ، نتابع ثيم الجهاز
  const hasExplicitChoice = useRef<boolean>(readSaved() !== null);

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // متابعة تغيير ثيم النظام (لو المستخدم لسه مختارش)
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const onChange = (e: MediaQueryListEvent) => {
      if (!hasExplicitChoice.current) {
        setThemeState(e.matches ? "dark" : "light");
      }
    };

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  // مزامنة بين التابات
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY && e.key !== null) return;

      const savedTheme =
        e.newValue === "light" || e.newValue === "dark" ? e.newValue : null;
      hasExplicitChoice.current = savedTheme !== null;
      setThemeState(savedTheme ?? getSystemTheme());
    };

    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    hasExplicitChoice.current = true;
    applyTheme(next, true);
    setThemeState(next);

    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  const value = useMemo(
    () => ({ theme, isDark: theme === "dark", setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}