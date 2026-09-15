import { useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  BookOpen,
  TrendingUp,
  ClipboardList,
  Award,
  Wallet,
  LifeBuoy,
  UserCircle,
  Menu,
  X,
  LogOut,
  Users,
  GraduationCap,
  FileStack,
  Receipt,
  ListChecks,
  Ticket,
  Smartphone,
  Settings,
  BarChart3,
  ChevronLeft,
  Bell,
  Sparkles,
  Mail,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  to: string;
  label: string;
  icon: React.ElementType;
}

const STUDENT_NAV: NavItem[] = [
  { to: "/app/home", label: "الرئيسية", icon: LayoutDashboard },
  { to: "/app/student/courses", label: "كورساتي", icon: BookOpen },
  { to: "/app/student/progress", label: "التقدّم", icon: TrendingUp },
  { to: "/app/student/quizzes", label: "الاختبارات", icon: ClipboardList },
  { to: "/app/student/grades", label: "الدرجات", icon: Award },
  { to: "/app/student/payments", label: "سجل المدفوعات", icon: Wallet },
  { to: "/app/student/support", label: "الدعم الفني", icon: LifeBuoy },
  { to: "/app/student/profile", label: "الملف الشخصي", icon: UserCircle },
];

const TEACHER_NAV: NavItem[] = [
  { to: "/app/home", label: "نظرة عامة", icon: LayoutDashboard },
  { to: "/app/teacher/courses", label: "كورساتي", icon: BookOpen },
  { to: "/app/teacher/students", label: "طلابي", icon: GraduationCap },
  { to: "/app/teacher/payments", label: "مراجعة المدفوعات", icon: Receipt },
    { to: "/app/student/support", label: "الدعم الفني", icon: LifeBuoy },
  { to: "/app/teacher/profile", label: "الملف الشخصي", icon: UserCircle },
];

const ADMIN_NAV: NavItem[] = [
  { to: "/app/home", label: "نظرة عامة", icon: LayoutDashboard },
  { to: "/app/admin/students", label: "الطلاب", icon: Users },
  { to: "/app/admin/teachers", label: "المعلمون", icon: GraduationCap },
  { to: "/app/admin/courses", label: "الكورسات", icon: FileStack },
  { to: "/app/admin/payments", label: "المدفوعات", icon: Receipt },
  { to: "/app/admin/enrollments", label: "الاشتراكات", icon: ListChecks },
  { to: "/app/admin/tickets", label: "الشكاوى والدعم", icon: Ticket },
  { to: "/app/admin/devices", label: "الأجهزة", icon: Smartphone },
  { to: "/app/admin/messages",label: "رسائل التواصل",  icon: Mail },
  { to: "/app/admin/reports", label: "التقارير", icon: BarChart3 },
  { to: "/app/admin/settings", label: "الإعدادات", icon: Settings },
];

export function DashboardLayout() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const nav =
    profile?.role === "admin"
      ? ADMIN_NAV
      : profile?.role === "teacher"
        ? TEACHER_NAV
        : STUDENT_NAV;

  const roleLabel =
    profile?.role === "admin"
      ? "لوحة الإدارة"
      : profile?.role === "teacher"
        ? "لوحة المعلم"
        : "لوحة الطالب";

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const activeItem =
    nav.find((item) =>
      item.to === "/app/home"
        ? location.pathname === "/app/home"
        : location.pathname.startsWith(item.to)
    )?.label || "نظرة عامة";

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-[#f6f9fb] text-slate-900"
    >
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 right-0 z-40 hidden w-[280px] border-l border-slate-200/70 bg-white shadow-[0_0_40px_rgba(15,23,42,0.04)] lg:flex">
        <SidebarContent
          nav={nav}
          roleLabel={roleLabel}
          profileName={profile?.full_name}
          role={profile?.role}
          onLogout={handleLogout}
        />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />

            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{
                type: "spring",
                stiffness: 320,
                damping: 32,
              }}
              className="absolute right-0 top-0 h-full w-[290px] max-w-[88vw] overflow-hidden bg-white shadow-2xl"
            >
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                  <span className="text-sm font-bold text-slate-500">
                    القائمة الرئيسية
                  </span>

                  <button
                    onClick={() => setOpen(false)}
                    aria-label="إغلاق القائمة"
                    className="grid h-9 w-9 place-items-center rounded-xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <SidebarContent
                  nav={nav}
                  roleLabel={roleLabel}
                  profileName={profile?.full_name}
                  role={profile?.role}
                  onLogout={handleLogout}
                  onNavigate={() => setOpen(false)}
                  mobile
                />
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main Area */}
      <div className="min-h-screen lg:mr-[280px]">
        {/* Top Header */}
        <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/90 backdrop-blur-xl">
          <div className="flex h-[76px] items-center justify-between px-4 sm:px-6 lg:px-8">
            {/* Mobile Logo */}
            <div className="flex items-center gap-3 lg:hidden">
              <button
                onClick={() => setOpen(true)}
                aria-label="فتح القائمة"
                className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
              >
                <Menu className="h-5 w-5" />
              </button>

              <Link
                to="/"
                className="flex items-center gap-2.5"
              >
                <LogoMark />
                <span className="text-lg font-black tracking-tight text-slate-900">
                  Med <span className="text-brand-500">Core</span>
                </span>
              </Link>
            </div>

            {/* Desktop Page Title */}
            <div className="hidden lg:block">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <span>Med Core</span>
                <ChevronLeft className="h-4 w-4" />
                <span className="font-semibold text-slate-700">
                  {activeItem}
                </span>
              </div>
            </div>

            {/* Header Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                aria-label="الإشعارات"
                className="relative grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
              >
                <Bell className="h-[18px] w-[18px]" />

                <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-brand-500 ring-2 ring-white" />
              </button>

              <div className="hidden h-8 w-px bg-slate-200 sm:block" />

              <div className="hidden items-center gap-3 sm:flex">
                <div className="text-left">
                  <p className="max-w-[150px] truncate text-sm font-bold text-slate-800">
                    {profile?.full_name || "مرحبًا بك"}
                  </p>
                  <p className="text-[11px] font-medium text-brand-500">
                    {roleLabel}
                  </p>
                </div>

                <UserAvatar name={profile?.full_name} />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="min-h-[calc(100vh-76px)] p-4 sm:p-6 lg:p-8">
          <div className="mx-auto w-full max-w-[1600px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function SidebarContent({
  nav,
  roleLabel,
  profileName,
  role,
  onLogout,
  onNavigate,
  mobile = false,
}: {
  nav: NavItem[];
  roleLabel: string;
  profileName?: string;
  role?: string;
  onLogout: () => void;
  onNavigate?: () => void;
  mobile?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Brand */}
      <div className="border-b border-slate-100 px-5 py-5">
        <Link
          to="/"
          onClick={onNavigate}
          className="group flex items-center gap-3"
        >
          <LogoMark />

          <div>
            <div className="text-[19px] font-black tracking-tight text-slate-900">
              Med <span className="text-brand-500">Core</span>
            </div>

            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-semibold text-slate-400">
              <Sparkles className="h-3 w-3 text-brand-500" />
              منصة التعليم الطبي
            </div>
          </div>
        </Link>
      </div>

      {/* Role Card */}
      <div className="px-4 pt-5">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-500 p-4 text-white shadow-[0_10px_30px_rgba(20,184,166,0.18)]">
          <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
          <div className="absolute -bottom-10 -right-5 h-28 w-28 rounded-full bg-white/10" />

          <div className="relative">
            <div className="mb-2 flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-lg bg-white/15 backdrop-blur">
                {role === "admin" ? (
                  <Settings className="h-4 w-4" />
                ) : role === "teacher" ? (
                  <GraduationCap className="h-4 w-4" />
                ) : (
                  <BookOpen className="h-4 w-4" />
                )}
              </div>

              <span className="text-xs font-semibold text-white/80">
                حسابك الحالي
              </span>
            </div>

            <p className="relative text-sm font-extrabold">
              {roleLabel}
            </p>

            <p className="relative mt-1 text-[11px] text-white/70">
              أهلاً بك في Med Core 👋
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="mb-2 mt-6 px-5">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          القائمة
        </p>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-4 scrollbar-thin scrollbar-thumb-slate-200">
        {nav.map((item, index) => (
          <NavLink
            key={item.to}
            to={item.to}
            onClick={onNavigate}
            end={item.to === "/app/home"}
            className={({ isActive }) =>
              clsx(
                "group relative flex items-center gap-3 rounded-xl px-3.5 py-3 text-[13px] font-semibold transition-all duration-200",
                isActive
                  ? "bg-brand-50 text-brand-700 shadow-sm"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId={mobile ? undefined : "activeNav"}
                    className="absolute right-0 h-7 w-1 rounded-l-full bg-brand-500"
                  />
                )}

                <span
                  className={clsx(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl transition-all duration-200",
                    isActive
                      ? "bg-brand-500 text-white shadow-[0_5px_15px_rgba(20,184,166,0.25)]"
                      : "bg-slate-50 text-slate-400 group-hover:bg-white group-hover:text-brand-500 group-hover:shadow-sm"
                  )}
                >
                  <item.icon className="h-[17px] w-[17px]" />
                </span>

                <span className="flex-1">{item.label}</span>

                {isActive && (
                  <ChevronLeft className="h-4 w-4 text-brand-500" />
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* User / Logout */}
      <div className="border-t border-slate-100 p-3">
        {profileName && (
          <div className="mb-2 flex items-center gap-3 rounded-xl bg-slate-50 p-2.5">
            <UserAvatar name={profileName} size="sm" />

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-slate-700">
                {profileName}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">
                {roleLabel}
              </p>
            </div>
          </div>
        )}

        <button
          onClick={onLogout}
          className="group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold text-red-500 transition hover:bg-red-50"
        >
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-red-50 transition group-hover:bg-red-100">
            <LogOut className="h-[17px] w-[17px]" />
          </span>

          <span>تسجيل الخروج</span>
        </button>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-[0_7px_20px_rgba(20,184,166,0.25)]">
      <div className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-white/15" />

      <span className="relative text-base font-black">M</span>
    </div>
  );
}

function UserAvatar({
  name,
  size = "md",
}: {
  name?: string;
  size?: "sm" | "md";
}) {
  const initial =
    name?.trim()?.charAt(0)?.toUpperCase() || "M";

  return (
    <div
      className={clsx(
        "grid shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand-500 to-brand-700 font-black text-white shadow-sm",
        size === "sm" ? "h-9 w-9 text-xs" : "h-10 w-10 text-sm"
      )}
    >
      {initial}
    </div>
  );
}
