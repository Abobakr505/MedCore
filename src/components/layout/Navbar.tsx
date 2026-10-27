import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Menu,
  X,
  ShoppingCart,
  User,
  LogOut,
  LayoutDashboard,
  ChevronLeft,
  Sparkles,
} from "lucide-react";

import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { fetchCart } from "@/services/cart";

const GUEST_LINKS = [
  { to: "/courses", label: "الكورسات" },
  { to: "/colleges", label: "الكليات" },
  { to: "/about", label: "عن المنصة" },
  { to: "/contact", label: "تواصل معنا" },
];

const ROLE_LINKS: Record<string, { to: string; label: string }[]> = {
  student: [
    { to: "/app/student/courses", label: "كورساتي" },
    { to: "/app/student/progress", label: "تقدمي" },
    { to: "/app/student/payments", label: "مدفوعاتي" },
    { to: "/courses", label: "تصفح الكورسات" },
  ],

  teacher: [
    { to: "/app/teacher/courses", label: "كورساتي" },
    { to: "/app/teacher/students", label: "طلابي" },
    { to: "/app/teacher/payments", label: "المحفظة" },
    { to: "/app/teacher/course-builder", label: "إنشاء محتوى" },
  ],

  admin: [
    { to: "/app/admin/students", label: "الطلاب" },
    { to: "/app/admin/courses", label: "الكورسات" },
    { to: "/app/admin/payments", label: "المدفوعات" },
    { to: "/app/admin/reports", label: "التقارير" },
  ],
};

const roleLabels: Record<string, string> = {
  student: "طالب",
  teacher: "معلم",
  admin: "مدير",
};

export function Navbar() {
  const [open, setOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);

  const { session, profile, signOut } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const loadCartCount = async () => {
      if (!session?.user || profile?.role !== "student") {
        setCartCount(0);
        return;
      }

      try {
        const items = await fetchCart(session.user.id);
        setCartCount(items.length);
      } catch {
        setCartCount(0);
      }
    };

    loadCartCount();

    window.addEventListener("cart-updated", loadCartCount);
    return () => window.removeEventListener("cart-updated", loadCartCount);
  }, [session?.user?.id, profile?.role]);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  const role = profile?.role ?? "guest";
  const isGuest = !session || !profile;

  const userName = profile?.full_name?.split(" ")[0] ?? "المستخدم";

  const navLinks = isGuest ? GUEST_LINKS : ROLE_LINKS[role] ?? GUEST_LINKS;

  const dashboardRoute =
    role === "student"
      ? "/app/student/courses"
      : role === "teacher"
      ? "/app/teacher/courses"
      : role === "admin"
      ? "/app/admin/reports"
      : "/app/home";

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/courses") {
      return location.pathname === "/courses";
    }

    return location.pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 shadow-sm shadow-slate-900/[0.03] backdrop-blur-xl dark:border-slate-800/70 dark:bg-slate-950/90 dark:shadow-black/20">
      {/* subtle top glow */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-l from-transparent via-brand-400/60 to-transparent" />

      <div className="mx-auto flex h-[74px] max-w-7xl items-center justify-between px-5 sm:px-6">
        {/* ================= LOGO ================= */}

        <Link to="/" className="group flex items-center gap-3">
          <motion.div
            whileHover={{ rotate: -4, scale: 1.05 }}
            transition={{ duration: 0.2 }}
            className="relative grid h-11 w-11 place-items-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-cyan-500 text-white shadow-lg shadow-brand-900/15 dark:shadow-brand-500/10"
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity group-hover:opacity-100" />

            <img
              src="/logo.png"
              alt="logo image 404"
              className="relative h-11 w-11 object-cover"
            />
          </motion.div>

          <div className="leading-none">
            <span className="block text-lg font-black tracking-tight text-slate-950 dark:text-white">
              Med <span className="text-brand-500 dark:text-brand-400">Core</span>
            </span>

            <span className="mt-1 hidden text-[9px] font-bold tracking-[0.16em] text-slate-400 dark:text-slate-500 sm:block">
              MEDICAL LEARNING PLATFORM
            </span>
          </div>
        </Link>

        {/* ================= DESKTOP NAV ================= */}

        <nav aria-label="التنقل الرئيسي" className="hidden items-center gap-1 rounded-full border border-slate-100 bg-slate-50/70 p-1 dark:border-slate-800 dark:bg-slate-900/70 md:flex">
          {navLinks.map((link) => {
            const active = isActive(link.to);

            return (
              <Link
                key={link.to}
                to={link.to}
                aria-current={active ? "page" : undefined}
                className="relative rounded-full px-4 py-2 text-sm font-semibold transition-colors"
              >
                {active && (
                  <motion.span
                    layoutId="navbar-active"
                    className="absolute inset-0 rounded-full bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-800 dark:ring-slate-700"
                    transition={{
                      type: "spring",
                      stiffness: 380,
                      damping: 30,
                    }}
                  />
                )}

                <span
                  className={`relative z-10 ${
                    active
                      ? "text-brand-600 dark:text-brand-300"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  }`}
                >
                  {link.label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* ================= DESKTOP ACTIONS ================= */}

        <div className="hidden items-center gap-2 md:flex">
          <ThemeToggle />

          {session ? (
            <>
              {/* Cart */}

              {role === "student" && (
                <Link
                  to="/app/cart"
                  className={`group relative grid h-10 w-10 place-items-center rounded-xl transition-all ${
                    isActive("/app/cart")
                      ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
                      : "text-slate-500 hover:bg-slate-50 hover:text-brand-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-brand-300"
                  }`}
                >
                  <ShoppingCart className="h-[18px] w-[18px] transition-transform group-hover:scale-110" />

                  <AnimatePresence>
                    {cartCount > 0 && (
                      <motion.span
                        key={cartCount} // يخلي الأنيميشن يشتغل كل مرة العدد يتغيّر
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 500, damping: 20 }}
                        className="absolute -right-1.5 -top-1.5 grid min-h-[20px] min-w-[20px] place-items-center rounded-full border-2 border-white bg-gradient-to-br from-brand-500 to-brand-600 px-1 text-[10px] font-black text-white shadow-md shadow-brand-500/40 dark:border-slate-950"
                      >
                        {/* هالة نابضة خلف الرقم */}
                        <motion.span
                          className="absolute inset-0 rounded-full bg-brand-400"
                          animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
                          transition={{
                            duration: 1.4,
                            repeat: Infinity,
                            ease: "easeOut",
                          }}
                        />
                        <span className="relative z-10">
                          {cartCount > 99 ? "99+" : cartCount}
                        </span>
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              )}

              {/* User */}

              <div className="flex items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/70 px-2 py-1.5 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 text-xs font-black text-white shadow-sm">
                  {userName.charAt(0)}
                </div>

                <div className="min-w-[65px] text-right leading-tight">
                  <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">
                    {userName}
                  </p>

                  <p className="mt-0.5 text-[9px] font-bold text-slate-400 dark:text-slate-500">
                    {roleLabels[role] ?? "عضو"}
                  </p>
                </div>
              </div>

              {/* Dashboard */}

              <Link to={dashboardRoute}>
                <Button size="sm" className="h-10 rounded-xl px-4 shadow-sm">
                  <LayoutDashboard className="h-4 w-4" />
                  لوحتي
                </Button>
              </Link>

              {/* Logout */}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleSignOut}
                title="تسجيل الخروج"
                className="grid h-10 w-10 place-items-center rounded-xl text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:text-slate-500 dark:hover:bg-red-500/10 dark:hover:text-red-400"
              >
                <LogOut className="h-[18px] w-[18px]" />
              </motion.button>
            </>
          ) : (
            <div className="flex items-center gap-2.5">
              {/* تسجيل الدخول */}
              <Link to="/auth/login">
                <Button
                  size="sm"
                  variant="ghost"
                  className="
                    group relative h-11 overflow-hidden rounded-xl
                    border border-slate-200/80 bg-white/80 px-5
                    font-semibold text-slate-700
                    shadow-sm backdrop-blur-sm
                    transition-all duration-300
                    hover:-translate-y-0.5
                    hover:border-brand-200
                    hover:bg-brand-50/70
                    hover:text-brand-700
                    hover:shadow-md hover:shadow-brand-900/5
                    active:translate-y-0
                    dark:border-slate-700
                    dark:bg-slate-900/70
                    dark:text-slate-200
                    dark:shadow-none
                    dark:hover:border-brand-500/40
                    dark:hover:bg-brand-500/10
                    dark:hover:text-brand-300
                  "
                >
                  <span className="relative z-10">تسجيل الدخول</span>

                  <span
                    className="
                      absolute inset-0 -translate-x-full
                      bg-gradient-to-r from-transparent
                      via-brand-50 to-transparent
                      transition-transform duration-700
                      group-hover:translate-x-full
                      dark:via-brand-500/10
                    "
                  />
                </Button>
              </Link>

              {/* إنشاء حساب */}
              <Link to="/auth/register">
                <Button
                  size="sm"
                  className="
                    group relative h-11 overflow-hidden rounded-xl
                    border border-brand-500/20
                    bg-gradient-to-l from-brand-600 to-brand-500
                    px-5 font-semibold text-white
                    shadow-lg shadow-brand-600/20
                    transition-all duration-300
                    hover:-translate-y-0.5
                    hover:from-brand-700
                    hover:to-brand-600
                    hover:shadow-xl hover:shadow-brand-600/30
                    active:translate-y-0
                    dark:shadow-brand-500/10
                  "
                >
                  {/* لمعان الزر */}
                  <span
                    className="
                      absolute inset-0 -translate-x-full
                      bg-gradient-to-r
                      from-transparent via-white/20 to-transparent
                      transition-transform duration-700
                      group-hover:translate-x-full
                    "
                  />

                  <User
                    className="
                      relative z-10 h-4 w-4
                      transition-transform duration-300
                      group-hover:scale-110
                    "
                  />

                  <span className="relative z-10">إنشاء حساب</span>
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* ================= MOBILE BUTTONS ================= */}

        <div className="flex items-center gap-2 md:hidden">
          <ThemeToggle className="border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900 h-11 w-11" />

          <button
            aria-label={open ? "إغلاق القائمة" : "فتح القائمة"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setOpen((value) => !value)}
            className="grid h-11 w-11 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-all hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          >
            <AnimatePresence mode="wait" initial={false}>
              {open ? (
                <motion.div
                  key="close"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                >
                  <X className="h-5 w-5" />
                </motion.div>
              ) : (
                <motion.div
                  key="menu"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                >
                  <Menu className="h-5 w-5" />
                </motion.div>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      {/* ================= MOBILE MENU ================= */}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 top-[74px] z-40 bg-slate-950/20 backdrop-blur-sm dark:bg-black/50 md:hidden"
            />

            <motion.div
              initial={{ opacity: 0, y: -15, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -15, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              id="mobile-navigation"
              role="navigation"
              aria-label="التنقل على الأجهزة المحمولة"
              className="absolute inset-x-3 top-[82px] z-50 max-h-[calc(100dvh-6rem)] overflow-y-auto overscroll-contain rounded-3xl border border-slate-100 bg-white p-3 shadow-2xl dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40 md:hidden"
            >
              {/* Mobile user */}

              {session && profile && (
                <div className="mb-3 flex items-center justify-between rounded-2xl bg-gradient-to-l from-brand-50 to-cyan-50 p-3 dark:from-brand-500/10 dark:to-cyan-500/10">
                  <div className="flex items-center gap-3">
                    <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-500 font-black text-white shadow-sm">
                      {userName.charAt(0)}
                    </div>

                    <div>
                      <p className="font-black text-slate-800 dark:text-slate-100">
                        {userName}
                      </p>

                      <p className="mt-1 text-[10px] font-bold text-brand-600 dark:text-brand-300">
                        {roleLabels[role] ?? "عضو"}
                      </p>
                    </div>
                  </div>

                  {role === "student" && (
                    <Link
                      to="/app/cart"
                      className="relative grid h-10 w-10 place-items-center rounded-xl bg-white text-slate-500 shadow-sm dark:bg-slate-800 dark:text-slate-300"
                    >
                      <ShoppingCart className="h-4 w-4" />

                      {cartCount > 0 && (
                        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[9px] font-black text-white">
                          {cartCount > 99 ? "99+" : cartCount}
                        </span>
                      )}
                    </Link>
                  )}
                </div>
              )}

              {/* Links */}

              <div className="space-y-1">
                {navLinks.map((link, index) => {
                  const active = isActive(link.to);

                  return (
                    <motion.div
                      key={link.to}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.04 }}
                    >
                      <Link
                        to={link.to}
                        onClick={() => setOpen(false)}
                        aria-current={active ? "page" : undefined}
                        className={`flex items-center justify-between rounded-2xl px-4 py-3.5 text-sm font-bold transition-all ${
                          active
                            ? "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
                            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                        }`}
                      >
                        <span>{link.label}</span>

                        <ChevronLeft
                          className={`h-4 w-4 ${
                            active
                              ? "text-brand-500"
                              : "text-slate-300 dark:text-slate-600"
                          }`}
                        />
                      </Link>
                    </motion.div>
                  );
                })}
              </div>

              {/* Theme switch */}

              <div className="mt-3">
                <ThemeToggle variant="switch" />
              </div>

              {/* Actions */}

              <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
                {session ? (
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <Link to={dashboardRoute}>
                      <Button
                        size="sm"
                        className="h-11 w-full rounded-xl"
                        onClick={() => setOpen(false)}
                      >
                        <LayoutDashboard className="h-4 w-4" />
                        لوحتي
                      </Button>
                    </Link>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={async () => {
                        setOpen(false);
                        await handleSignOut();
                      }}
                      className="h-11 rounded-xl border-red-100 px-4 text-red-500 hover:bg-red-50 dark:border-red-500/20 dark:hover:bg-red-500/10"
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Link to="/auth/login">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-11 w-full rounded-xl"
                        onClick={() => setOpen(false)}
                      >
                        دخول
                      </Button>
                    </Link>

                    <Link to="/auth/register">
                      <Button
                        size="sm"
                        className="h-11 w-full rounded-xl"
                        onClick={() => setOpen(false)}
                      >
                        إنشاء حساب
                      </Button>
                    </Link>
                  </div>
                )}
              </div>

              <div className="mt-3 flex items-center justify-center gap-2 rounded-2xl bg-slate-50 py-2.5 text-[10px] font-bold text-slate-400 dark:bg-slate-800/60 dark:text-slate-500">
                <Sparkles className="h-3.5 w-3.5 text-brand-500" />
                تعلم الطب بطريقة أذكى مع Med Core
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}