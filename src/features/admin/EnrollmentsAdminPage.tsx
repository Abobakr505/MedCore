import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Search,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  BookOpen,
  Bell,
  X,
  ChevronDown,
  PauseCircle,
  Ban,
  PlayCircle,
  Loader2,
  AlertTriangle,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import {
  fetchAllEnrollments,
  updateEnrollmentStatus,
  type EnrollmentStatus,
} from "@/services/enrollments";

import { ENROLLMENT_STATUS_LABELS } from "@/types";

import { formatDate } from "@/utils/format";

const NEW_WINDOW_HOURS = 48; // أي اشتراك خلال هذه المدة يعتبر "جديد"
const REFRESH_INTERVAL_MS = 60_000; // تحديث تلقائي كل دقيقة
const BANNER_PREVIEW_COUNT = 4; // عدد الاشتراكات الظاهرة قبل "عرض الكل"
const LAST_SEEN_KEY = "admin_enrollments_last_seen";

const STATUS_COLORS: Record<string, "green" | "amber" | "red" | "slate"> = {
  active: "green",
  pending: "amber",
  suspended: "red",
  cancelled: "slate",
};

const STATUS_ICONS: Record<string, typeof CheckCircle2> = {
  active: CheckCircle2,
  pending: Clock3,
  suspended: XCircle,
  cancelled: XCircle,
};

// احتياطي لو ENROLLMENT_STATUS_LABELS مفيهاش الحالة
const FALLBACK_LABELS: Record<string, string> = {
  active: "نشط",
  pending: "معلق",
  suspended: "موقوف",
  cancelled: "ملغي",
};

function statusLabel(status: string) {
  return (
    (ENROLLMENT_STATUS_LABELS as Record<string, string>)[status] ||
    FALLBACK_LABELS[status] ||
    status
  );
}

type Tone = "amber" | "red" | "emerald";

const ACTIONS: Record<
  EnrollmentStatus,
  {
    label: string;
    icon: typeof PauseCircle;
    tone: Tone;
    confirmTitle: string;
    confirmText: (student: string, course: string) => string;
    confirmButton: string;
    success: string;
  }
> = {
  suspended: {
    label: "إيقاف",
    icon: PauseCircle,
    tone: "amber",
    confirmTitle: "إيقاف الاشتراك؟",
    confirmText: (s, c) =>
      `سيتم إيقاف اشتراك "${s}" في كورس "${c}"، ولن يستطيع الطالب الدخول للكورس حتى تعيد تفعيله.`,
    confirmButton: "نعم، أوقف الاشتراك",
    success: "تم إيقاف الاشتراك",
  },
  cancelled: {
    label: "إلغاء",
    icon: Ban,
    tone: "red",
    confirmTitle: "إلغاء الاشتراك؟",
    confirmText: (s, c) =>
      `سيتم إلغاء اشتراك "${s}" في كورس "${c}". تقدر ترجّع تفعيله بعدين لو احتجت.`,
    confirmButton: "نعم، ألغِ الاشتراك",
    success: "تم إلغاء الاشتراك",
  },
  active: {
    label: "تفعيل",
    icon: PlayCircle,
    tone: "emerald",
    confirmTitle: "تفعيل الاشتراك؟",
    confirmText: (s, c) =>
      `سيتم تفعيل اشتراك "${s}" في كورس "${c}" ويقدر الطالب يدخل الكورس مرة أخرى.`,
    confirmButton: "نعم، فعّل الاشتراك",
    success: "تم تفعيل الاشتراك",
  },
  pending: {
    label: "تعليق",
    icon: Clock3,
    tone: "amber",
    confirmTitle: "تعليق الاشتراك؟",
    confirmText: (s, c) => `سيتم تعليق اشتراك "${s}" في كورس "${c}".`,
    confirmButton: "نعم، علّق الاشتراك",
    success: "تم تعليق الاشتراك",
  },
};

// الإجراءات المتاحة لكل حالة
const AVAILABLE_ACTIONS: Record<string, EnrollmentStatus[]> = {
  active: ["suspended", "cancelled"],
  pending: ["active", "cancelled"],
  suspended: ["active", "cancelled"],
  cancelled: ["active"],
};

const TONE_CLASSES: Record<Tone, string> = {
  amber:
    "bg-amber-50 text-amber-700 ring-amber-200 hover:bg-amber-100 hover:text-amber-800",
  red: "bg-red-50 text-red-700 ring-red-200 hover:bg-red-100 hover:text-red-800",
  emerald:
    "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100 hover:text-emerald-800",
};

const CONFIRM_BUTTON_CLASSES: Record<Tone, string> = {
  amber: "bg-amber-500 hover:bg-amber-600 focus:ring-amber-500/30",
  red: "bg-red-500 hover:bg-red-600 focus:ring-red-500/30",
  emerald: "bg-emerald-500 hover:bg-emerald-600 focus:ring-emerald-500/30",
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return minutes === 1 ? "منذ دقيقة" : `منذ ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "منذ ساعة" : `منذ ${hours} ساعة`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "منذ يوم" : `منذ ${days} يوم`;
}

export default function EnrollmentsAdminPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [bannerExpanded, setBannerExpanded] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  // إجراءات الإيقاف/الإلغاء/التفعيل
  const [confirm, setConfirm] = useState<{
    row: any;
    status: EnrollmentStatus;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const load = useCallback((silent = false) => {
    if (!silent) setLoading(true);

    return fetchAllEnrollments()
      .then(setRows)
      .catch(() => {})
      .finally(() => {
        if (!silent) setLoading(false);
      });
  }, []);

  useEffect(() => {
    load();

    const id = setInterval(() => load(true), REFRESH_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load]);

  // إخفاء رسالة النتيجة تلقائياً
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(id);
  }, [toast]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      pending: rows.filter((r) => r.status === "pending").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
      cancelled: rows.filter((r) => r.status === "cancelled").length,
    };
  }, [rows]);

  // الاشتراكات الجديدة: خلال آخر 48 ساعة وبعد آخر مرة ضغط فيها "تم الاطلاع"
  const newRows = useMemo(() => {
    const cutoff = Date.now() - NEW_WINDOW_HOURS * 60 * 60 * 1000;

    return rows
      .filter((row) => {
        if (!row.enrolled_at) return false;
        const t = new Date(row.enrolled_at).getTime();
        return t > cutoff && t > lastSeen;
      })
      .sort(
        (a, b) =>
          new Date(b.enrolled_at).getTime() -
          new Date(a.enrolled_at).getTime()
      );
  }, [rows, lastSeen]);

  const newIds = useMemo(() => new Set(newRows.map((r) => r.id)), [newRows]);

  const dismissBanner = () => {
    const now = Date.now();
    setLastSeen(now);
    setBannerExpanded(false);

    try {
      localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  };

  const requestAction = (row: any, status: EnrollmentStatus) => {
    setConfirm({ row, status });
  };

  const runAction = async () => {
    if (!confirm) return;

    const { row, status } = confirm;
    setBusyId(row.id);

    try {
      await updateEnrollmentStatus(row.id, status);

      setRows((prev) =>
        prev.map((r) => (r.id === row.id ? { ...r, status } : r))
      );
      setToast({ type: "success", message: ACTIONS[status].success });
    } catch (err) {
      setToast({
        type: "error",
        message:
          err instanceof Error && err.message
            ? err.message
            : "تعذر تحديث الاشتراك، حاول مرة أخرى",
      });
    } finally {
      setBusyId(null);
      setConfirm(null);
    }
  };

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter = filter === "all" || row.status === filter;

      if (!matchesFilter) return false;

      if (!query) return true;

      const studentName = row.student?.full_name?.toLowerCase() || "";
      const studentEmail = row.student?.email?.toLowerCase() || "";
      const courseTitle = row.course?.title?.toLowerCase() || "";

      return (
        studentName.includes(query) ||
        studentEmail.includes(query) ||
        courseTitle.includes(query)
      );
    });
  }, [rows, search, filter]);

  const filters = [
    { value: "all", label: "الكل", count: stats.total },
    { value: "active", label: "نشطة", count: stats.active },
    { value: "pending", label: "معلقة", count: stats.pending },
    { value: "suspended", label: "موقوفة", count: stats.suspended },
    { value: "cancelled", label: "ملغاة", count: stats.cancelled },
  ];

  const visibleNew = bannerExpanded
    ? newRows
    : newRows.slice(0, BANNER_PREVIEW_COUNT);

  return (
    <div className="space-y-6">
      {/* New enrollments banner */}
      {!loading && newRows.length > 0 && (
        <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-l from-brand-50 via-white to-white p-5 shadow-sm">
          <div className="absolute inset-y-0 right-0 w-1.5 bg-brand-500" />

          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/30">
                <Bell className="h-5 w-5" />
                <span className="absolute -left-1 -top-1 flex h-3.5 w-3.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                  <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
                </span>
              </div>

              <div>
                <h2 className="text-base font-extrabold text-slate-900">
                  {newRows.length === 1
                    ? "اشتراك جديد"
                    : `${newRows.length} اشتراكات جديدة`}
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  آخر {NEW_WINDOW_HOURS} ساعة — الأحدث أولاً
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={dismissBanner}
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
            >
              <X className="h-3.5 w-3.5" />
              تم الاطلاع
            </button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {visibleNew.map((row) => {
              const StatusIcon = STATUS_ICONS[row.status] || Clock3;

              return (
                <div
                  key={row.id}
                  className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-extrabold text-brand-600">
                    {row.student?.full_name?.charAt(0)?.toUpperCase() || "؟"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {row.student?.full_name || "طالب غير معروف"}
                    </p>

                    <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-slate-500">
                      <BookOpen className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {row.course?.title || "كورس غير معروف"}
                      </span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge color={STATUS_COLORS[row.status] || "slate"}>
                      <span className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {statusLabel(row.status)}
                      </span>
                    </Badge>

                    <span className="text-[11px] text-slate-400">
                      {timeAgo(row.enrolled_at)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {newRows.length > BANNER_PREVIEW_COUNT && (
            <button
              type="button"
              onClick={() => setBannerExpanded((v) => !v)}
              className="mt-3 flex items-center gap-1.5 text-xs font-bold text-brand-700 transition hover:text-brand-800"
            >
              {bannerExpanded
                ? "عرض أقل"
                : `عرض الكل (${newRows.length - BANNER_PREVIEW_COUNT} إضافية)`}
              <ChevronDown
                className={`h-3.5 w-3.5 transition ${
                  bannerExpanded ? "rotate-180" : ""
                }`}
              />
            </button>
          )}
        </div>
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-52 w-52 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <ListChecks className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  إدارة الاشتراكات
                </h1>

                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {stats.total} اشتراك
                </span>
              </div>

              <p className="mt-2 text-sm leading-6 text-slate-500">
                متابعة اشتراكات الطلاب في الكورسات، وإيقاف أو إلغاء أو تفعيل أي
                اشتراك بسرعة.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              icon={<Users className="h-4 w-4" />}
              label="الإجمالي"
              value={stats.total}
            />

            <MiniStat
              icon={<CheckCircle2 className="h-4 w-4" />}
              label="نشطة"
              value={stats.active}
              iconClass="bg-emerald-50 text-emerald-600"
            />

            <MiniStat
              icon={<Clock3 className="h-4 w-4" />}
              label="معلقة"
              value={stats.pending}
              iconClass="bg-amber-50 text-amber-600"
            />

            <MiniStat
              icon={<PauseCircle className="h-4 w-4" />}
              label="موقوفة / ملغاة"
              value={stats.suspended + stats.cancelled}
              iconClass="bg-red-50 text-red-600"
            />
          </div>
        </div>
      </div>

      {/* Search */}
      <Card className="p-4">
        <div className="relative">
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الطالب أو البريد أو اسم الكورس..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
      </Card>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map((item) => {
          const active = filter === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() => setFilter(item.value)}
              className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition ${
                active
                  ? "bg-brand-500 text-white shadow-md shadow-brand-500/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700"
              }`}
            >
              {item.label}

              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  active
                    ? "bg-white/20 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {item.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="p-5">
              <div className="flex items-center gap-4">
                <Skeleton className="h-12 w-12 rounded-2xl" />

                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-44" />
                  <Skeleton className="h-3 w-64" />
                </div>

                <Skeleton className="h-8 w-20 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={<ListChecks className="h-6 w-6" />}
            title={
              search || filter !== "all"
                ? "لا توجد اشتراكات مطابقة"
                : "لا توجد اشتراكات بعد"
            }
          />

          {(search || filter !== "all") && (
            <div className="flex justify-center pb-6">
              <button
                type="button"
                onClick={() => {
                  setSearch("");
                  setFilter("all");
                }}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
              >
                إعادة ضبط البحث والفلاتر
              </button>
            </div>
          )}
        </Card>
      ) : (
        <>
          {/* Desktop */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-right">
                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      الطالب
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      الكورس
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      تاريخ الاشتراك
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      الحالة
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      الإجراءات
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const StatusIcon = STATUS_ICONS[row.status] || Clock3;
                    const isNew = newIds.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        className={`group transition hover:bg-slate-50/70 ${
                          isNew ? "bg-brand-50/40" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-extrabold text-brand-600">
                              {row.student?.full_name
                                ?.charAt(0)
                                ?.toUpperCase() || "؟"}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="truncate font-bold text-slate-800">
                                  {row.student?.full_name || "طالب غير معروف"}
                                </p>

                                {isNew && (
                                  <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                    جديد
                                  </span>
                                )}
                              </div>

                              <p className="mt-0.5 truncate text-xs text-slate-400">
                                {row.student?.email || "لا يوجد بريد"}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500">
                              <BookOpen className="h-4 w-4" />
                            </div>

                            <span className="font-semibold text-slate-700">
                              {row.course?.title || "كورس غير معروف"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(row.enrolled_at)}
                        </td>

                        <td className="px-5 py-4">
                          <Badge color={STATUS_COLORS[row.status] || "slate"}>
                            <span className="flex items-center gap-1.5">
                              <StatusIcon className="h-3.5 w-3.5" />

                              {statusLabel(row.status)}
                            </span>
                          </Badge>
                        </td>

                        <td className="px-5 py-4">
                          <RowActions
                            row={row}
                            busy={busyId === row.id}
                            onAction={requestAction}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile */}
          <div className="grid gap-3 md:hidden">
            {filteredRows.map((row) => {
              const StatusIcon = STATUS_ICONS[row.status] || Clock3;
              const isNew = newIds.has(row.id);

              return (
                <Card
                  key={row.id}
                  className="relative overflow-hidden p-4"
                >
                  <div className="absolute inset-y-0 right-0 w-1 bg-brand-500" />

                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-extrabold text-brand-600">
                      {row.student?.full_name?.charAt(0)?.toUpperCase() || "؟"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate font-extrabold text-slate-800">
                          {row.student?.full_name || "طالب غير معروف"}
                        </p>

                        {isNew && (
                          <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                            جديد
                          </span>
                        )}
                      </div>

                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {row.student?.email || "لا يوجد بريد"}
                      </p>
                    </div>

                    <Badge color={STATUS_COLORS[row.status] || "slate"}>
                      <span className="flex items-center gap-1">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusLabel(row.status)}
                      </span>
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <BookOpen className="h-3.5 w-3.5" />
                        الكورس
                      </div>

                      <p className="mt-1 truncate text-sm font-bold text-slate-700">
                        {row.course?.title || "غير معروف"}
                      </p>
                    </div>

                    <div className="rounded-xl bg-slate-50 p-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Clock3 className="h-3.5 w-3.5" />
                        تاريخ الاشتراك
                      </div>

                      <p className="mt-1 text-sm font-bold text-slate-700">
                        {formatDate(row.enrolled_at)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3">
                    <RowActions
                      row={row}
                      busy={busyId === row.id}
                      onAction={requestAction}
                      fullWidth
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {!loading && filteredRows.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          عرض {filteredRows.length} من أصل {rows.length} اشتراك
        </p>
      )}

      {/* Confirm dialog */}
      {confirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => busyId === null && setConfirm(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ring-1 ${
                  TONE_CLASSES[ACTIONS[confirm.status].tone]
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
              </div>

              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {ACTIONS[confirm.status].confirmTitle}
                </h3>

                <p className="mt-1.5 text-sm leading-6 text-slate-500">
                  {ACTIONS[confirm.status].confirmText(
                    confirm.row.student?.full_name || "طالب غير معروف",
                    confirm.row.course?.title || "كورس غير معروف"
                  )}
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
              <button
                type="button"
                disabled={busyId !== null}
                onClick={runAction}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white outline-none transition focus:ring-4 disabled:opacity-60 ${
                  CONFIRM_BUTTON_CLASSES[ACTIONS[confirm.status].tone]
                }`}
              >
                {busyId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
                {ACTIONS[confirm.status].confirmButton}
              </button>

              <button
                type="button"
                disabled={busyId !== null}
                onClick={() => setConfirm(null)}
                className="rounded-xl bg-slate-100 px-5 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-200 disabled:opacity-60"
              >
                تراجع
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white shadow-lg ${
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <XCircle className="h-4 w-4" />
          )}
          {toast.message}
        </div>
      )}
    </div>
  );
}

function RowActions({
  row,
  busy,
  onAction,
  fullWidth = false,
}: {
  row: any;
  busy: boolean;
  onAction: (row: any, status: EnrollmentStatus) => void;
  fullWidth?: boolean;
}) {
  const available = AVAILABLE_ACTIONS[row.status] ?? [];

  if (available.length === 0) return null;

  return (
    <div className={`flex gap-2 ${fullWidth ? "" : "flex-wrap"}`}>
      {available.map((status) => {
        const action = ACTIONS[status];
        const Icon = action.icon;

        return (
          <button
            key={status}
            type="button"
            disabled={busy}
            onClick={() => onAction(row, status)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold ring-1 transition disabled:cursor-not-allowed disabled:opacity-50 ${
              fullWidth ? "flex-1" : ""
            } ${TONE_CLASSES[action.tone]}`}
          >
            {busy ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Icon className="h-3.5 w-3.5" />
            )}
            {action.label}
          </button>
        );
      })}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  iconClass = "bg-brand-50 text-brand-600",
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconClass?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white px-3 py-2.5 shadow-sm">
      <div
        className={`mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${iconClass}`}
      >
        {icon}
      </div>

      <p className="text-lg font-extrabold text-slate-900">{value}</p>

      <p className="text-[11px] font-medium text-slate-400">{label}</p>
    </div>
  );
}