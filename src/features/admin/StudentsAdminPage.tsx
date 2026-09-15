import { useEffect, useMemo, useState } from "react";
import {
  Users,
  Ban,
  CheckCircle2,
  Search,
  GraduationCap,
  UserRound,
  Mail,
  CalendarDays,
  UserCheck,
  UserX,
  Clock3,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useToast } from "@/contexts/ToastContext";

import {
  fetchUsersByRole,
  updateUserStatus,
} from "@/services/admin";

import type { Profile } from "@/types";
import { COLLEGE_LABELS } from "@/types";

import { formatDate } from "@/utils/format";

const STATUS_COLORS: Record<
  string,
  "green" | "red" | "amber"
> = {
  active: "green",
  suspended: "red",
  pending_verification: "amber",
};

const STATUS_LABELS: Record<string, string> = {
  active: "نشط",
  suspended: "موقوف",
  pending_verification: "بانتظار التفعيل",
};

export default function StudentsAdminPage() {
  const { showToast } = useToast();

  const [students, setStudents] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);

    try {
      const data = await fetchUsersByRole("student");
      setStudents(data);
    } catch {
      showToast("تعذّر تحميل الطلاب", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => ({
      total: students.length,
      active: students.filter((s) => s.status === "active").length,
      suspended: students.filter(
        (s) => s.status === "suspended"
      ).length,
      pending: students.filter(
        (s) => s.status === "pending_verification"
      ).length,
    }),
    [students]
  );

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesFilter =
        filter === "all" || student.status === filter;

      if (!matchesFilter) return false;

      if (!query) return true;

      const name =
        student.full_name?.toLowerCase() || "";

      const email =
        student.email?.toLowerCase() || "";

      const college =
        COLLEGE_LABELS[student.college]?.toLowerCase() || "";

      return (
        name.includes(query) ||
        email.includes(query) ||
        college.includes(query)
      );
    });
  }, [students, search, filter]);

  const toggleStatus = async (student: Profile) => {
    const newStatus =
      student.status === "suspended"
        ? "active"
        : "suspended";

    setProcessingId(student.id);

    try {
      await updateUserStatus(student.id, newStatus);

      showToast(
        newStatus === "suspended"
          ? "تم إيقاف حساب الطالب"
          : "تم تفعيل حساب الطالب",
        "success"
      );

      await load();
    } catch {
      showToast("تعذّر تحديث حالة الحساب", "error");
    } finally {
      setProcessingId(null);
    }
  };

  const filters = [
    {
      value: "all",
      label: "الكل",
      count: stats.total,
    },
    {
      value: "active",
      label: "نشط",
      count: stats.active,
    },
    {
      value: "suspended",
      label: "موقوف",
      count: stats.suspended,
    },
    {
      value: "pending_verification",
      label: "بانتظار التفعيل",
      count: stats.pending,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-52 w-52 rounded-full bg-blue-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 ring-1 ring-brand-100">
              <GraduationCap className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  إدارة الطلاب
                </h1>

                <span className="rounded-full bg-brand-50 px-2.5 py-1 text-xs font-bold text-brand-700">
                  {stats.total} طالب
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة حسابات الطلاب، متابعة حالاتهم والتحكم في إمكانية
                الوصول إلى المنصة.
              </p>
            </div>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-3 gap-3  ">
            <MiniStat
              icon={<UserCheck className="h-4 w-4" />}
              label="نشط"
              value={stats.active}
              iconClass="bg-emerald-50 text-emerald-600"
            />
            <MiniStat
              icon={<UserX className="h-4 w-4" />}
              label="موقوف"
              value={stats.suspended}
              iconClass="bg-red-50 text-red-600"
            />

            <MiniStat
              icon={<Clock3 className="h-4 w-4" />}
              label="معلق"
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
            placeholder="ابحث باسم الطالب أو البريد الإلكتروني أو الكلية..."
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

      {/* Loading */}
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

                <Skeleton className="h-9 w-24 rounded-xl" />
              </div>
            </Card>
          ))}
        </div>
      ) : filteredStudents.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={<Users className="h-6 w-6" />}
            title={
              search || filter !== "all"
                ? "لا يوجد طلاب مطابقون للبحث"
                : "لا يوجد طلاب مسجّلون"
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
          {/* Desktop Table */}
          <Card className="hidden overflow-hidden md:block">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-right">
                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      الطالب
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      الكلية
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      تاريخ التسجيل
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      الحالة
                    </th>

                    <th className="px-5 py-4 text-xs font-extrabold text-slate-500">
                      إجراء
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => (
                    <tr
                      key={student.id}
                      className="group transition hover:bg-slate-50/70"
                    >
                      {/* Student */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-extrabold text-brand-600">
                            {student.full_name
                              ?.charAt(0)
                              ?.toUpperCase() || "؟"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-slate-800">
                              {student.full_name ||
                                "طالب غير معروف"}
                            </p>

                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                              <Mail className="h-3.5 w-3.5" />

                              <span className="truncate">
                                {student.email || "لا يوجد بريد"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* College */}
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                          {COLLEGE_LABELS[student.college] ||
                            "غير محددة"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          <span>{formatDate(student.created_at)}</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge
                          color={
                            STATUS_COLORS[student.status] ||
                            "amber"
                          }
                        >
                          {STATUS_LABELS[student.status] ||
                            student.status}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        {student.status !==
                        "pending_verification" ? (
                          <Button
                            size="sm"
                            variant={
                              student.status === "suspended"
                                ? "secondary"
                                : "outline"
                            }
                            isLoading={
                              processingId === student.id
                            }
                            onClick={() =>
                              toggleStatus(student)
                            }
                          >
                            {student.status === "suspended" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5 text-red-500" />
                            )}

                            {student.status === "suspended"
                              ? "تفعيل"
                              : "إيقاف"}
                          </Button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            بانتظار التفعيل
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mobile Cards */}
          <div className="grid gap-3 md:hidden">
            {filteredStudents.map((student) => (
              <Card
                key={student.id}
                className="relative overflow-hidden p-4"
              >
                <div
                  className={`absolute inset-y-0 right-0 w-1 ${
                    student.status === "active"
                      ? "bg-emerald-500"
                      : student.status === "suspended"
                        ? "bg-red-500"
                        : "bg-amber-500"
                  }`}
                />

                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 font-extrabold text-brand-600">
                    {student.full_name
                      ?.charAt(0)
                      ?.toUpperCase() || "؟"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-slate-800">
                          {student.full_name ||
                            "طالب غير معروف"}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-400">
                          {student.email || "لا يوجد بريد"}
                        </p>
                      </div>

                      <Badge
                        color={
                          STATUS_COLORS[student.status] ||
                          "amber"
                        }
                      >
                        {STATUS_LABELS[student.status] ||
                          student.status}
                      </Badge>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <GraduationCap className="h-3.5 w-3.5" />
                      الكلية
                    </div>

                    <p className="mt-1 truncate text-sm font-bold text-slate-700">
                      {COLLEGE_LABELS[student.college] ||
                        "غير محددة"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      التسجيل
                    </div>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {formatDate(student.created_at)}
                    </p>
                  </div>
                </div>

                {student.status !==
                  "pending_verification" && (
                  <Button
                    size="sm"
                    variant={
                      student.status === "suspended"
                        ? "secondary"
                        : "outline"
                    }
                    isLoading={
                      processingId === student.id
                    }
                    onClick={() => toggleStatus(student)}
                    className="mt-3 w-full"
                  >
                    {student.status === "suspended" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Ban className="h-4 w-4 text-red-500" />
                    )}

                    {student.status === "suspended"
                      ? "تفعيل حساب الطالب"
                      : "إيقاف حساب الطالب"}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {!loading && filteredStudents.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          عرض {filteredStudents.length} من أصل {students.length} طالب
        </p>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
  iconClass,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconClass: string;
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