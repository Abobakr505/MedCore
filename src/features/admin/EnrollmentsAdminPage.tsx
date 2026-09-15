import { useEffect, useMemo, useState } from "react";
import {
  ListChecks,
  Search,
  Users,
  CheckCircle2,
  Clock3,
  XCircle,
  BookOpen,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { fetchAllEnrollments } from "@/services/enrollments";

import {
  ENROLLMENT_STATUS_LABELS,
} from "@/types";

import { formatDate } from "@/utils/format";

const STATUS_COLORS: Record<
  string,
  "green" | "amber" | "red" | "slate"
> = {
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

export default function EnrollmentsAdminPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    setLoading(true);

    fetchAllEnrollments()
      .then(setRows)
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      active: rows.filter((r) => r.status === "active").length,
      pending: rows.filter((r) => r.status === "pending").length,
      suspended: rows.filter((r) => r.status === "suspended").length,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter =
        filter === "all" || row.status === filter;

      if (!matchesFilter) return false;

      if (!query) return true;

      const studentName =
        row.student?.full_name?.toLowerCase() || "";

      const studentEmail =
        row.student?.email?.toLowerCase() || "";

      const courseTitle =
        row.course?.title?.toLowerCase() || "";

      return (
        studentName.includes(query) ||
        studentEmail.includes(query) ||
        courseTitle.includes(query)
      );
    });
  }, [rows, search, filter]);

  const filters = [
    {
      value: "all",
      label: "الكل",
      count: stats.total,
    },
    {
      value: "active",
      label: "نشطة",
      count: stats.active,
    },
    {
      value: "pending",
      label: "معلقة",
      count: stats.pending,
    },
    {
      value: "suspended",
      label: "موقوفة",
      count: stats.suspended,
    },
  ];

  return (
    <div className="space-y-6">
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
                متابعة اشتراكات الطلاب في الكورسات ومعرفة حالة كل اشتراك
                بشكل سريع.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
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
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredRows.map((row) => {
                    const StatusIcon =
                      STATUS_ICONS[row.status] || Clock3;

                    return (
                      <tr
                        key={row.id}
                        className="group transition hover:bg-slate-50/70"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-extrabold text-brand-600">
                              {row.student?.full_name
                                ?.charAt(0)
                                ?.toUpperCase() || "؟"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate font-bold text-slate-800">
                                {row.student?.full_name ||
                                  "طالب غير معروف"}
                              </p>

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
                              {row.course?.title ||
                                "كورس غير معروف"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {formatDate(row.enrolled_at)}
                        </td>

                        <td className="px-5 py-4">
                          <Badge
                            color={
                              STATUS_COLORS[row.status] || "slate"
                            }
                          >
                            <span className="flex items-center gap-1.5">
                              <StatusIcon className="h-3.5 w-3.5" />

                              {ENROLLMENT_STATUS_LABELS[
                                row.status
                              ] || row.status}
                            </span>
                          </Badge>
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
              const StatusIcon =
                STATUS_ICONS[row.status] || Clock3;

              return (
                <Card
                  key={row.id}
                  className="relative overflow-hidden p-4"
                >
                  <div className="absolute inset-y-0 right-0 w-1 bg-brand-500" />

                  <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-extrabold text-brand-600">
                      {row.student?.full_name
                        ?.charAt(0)
                        ?.toUpperCase() || "؟"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-extrabold text-slate-800">
                        {row.student?.full_name ||
                          "طالب غير معروف"}
                      </p>

                      <p className="mt-0.5 truncate text-xs text-slate-400">
                        {row.student?.email || "لا يوجد بريد"}
                      </p>
                    </div>

                    <Badge
                      color={
                        STATUS_COLORS[row.status] || "slate"
                      }
                    >
                      <span className="flex items-center gap-1">
                        <StatusIcon className="h-3.5 w-3.5" />
                        {ENROLLMENT_STATUS_LABELS[
                          row.status
                        ] || row.status}
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

      <p className="text-lg font-extrabold text-slate-900">
        {value}
      </p>

      <p className="text-[11px] font-medium text-slate-400">
        {label}
      </p>
    </div>
  );
}