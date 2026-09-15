import { useEffect, useMemo, useState } from "react";
import {
  GraduationCap,
  Ban,
  CheckCircle2,
  Search,
  Mail,
  CalendarDays,
  UserCheck,
  UserX,
  Clock3,
  Users,
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

export default function TeachersAdminPage() {
  const { showToast } = useToast();

  const [teachers, setTeachers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [processingId, setProcessingId] = useState<string | null>(
    null
  );

  const load = async () => {
    setLoading(true);

    try {
      const data = await fetchUsersByRole("teacher");
      setTeachers(data);
    } catch {
      showToast("تعذّر تحميل المعلمين", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const stats = useMemo(
    () => ({
      total: teachers.length,
      active: teachers.filter((t) => t.status === "active").length,
      suspended: teachers.filter(
        (t) => t.status === "suspended"
      ).length,
      pending: teachers.filter(
        (t) => t.status === "pending_verification"
      ).length,
    }),
    [teachers]
  );

  const filteredTeachers = useMemo(() => {
    const query = search.trim().toLowerCase();

    return teachers.filter((teacher) => {
      const matchesFilter =
        filter === "all" || teacher.status === filter;

      if (!matchesFilter) return false;

      if (!query) return true;

      const name =
        teacher.full_name?.toLowerCase() || "";

      const email =
        teacher.email?.toLowerCase() || "";

      const college =
        COLLEGE_LABELS[teacher.college]?.toLowerCase() || "";

      return (
        name.includes(query) ||
        email.includes(query) ||
        college.includes(query)
      );
    });
  }, [teachers, search, filter]);

  const toggleStatus = async (teacher: Profile) => {
    const newStatus =
      teacher.status === "suspended"
        ? "active"
        : "suspended";

    setProcessingId(teacher.id);

    try {
      await updateUserStatus(teacher.id, newStatus);

      showToast(
        newStatus === "suspended"
          ? "تم إيقاف حساب المعلم"
          : "تم تفعيل حساب المعلم",
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
        <div className="absolute -left-16 -top-20 h-48 w-48 rounded-full bg-purple-500/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-52 w-52 rounded-full bg-brand-500/5 blur-3xl" />

        <div className="relative flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
              <GraduationCap className="h-7 w-7" />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                  إدارة المعلمين
                </h1>

                <span className="rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700">
                  {stats.total} معلم
                </span>
              </div>

              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                إدارة حسابات المعلمين، متابعة حالاتهم والتحكم في
                إمكانية الوصول إلى لوحة المعلم.
              </p>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-3">
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
            placeholder="ابحث باسم المعلم أو البريد الإلكتروني أو الكلية..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pr-10 pl-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-purple-400 focus:bg-white focus:ring-4 focus:ring-purple-500/10"
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
                  ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
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
      ) : filteredTeachers.length === 0 ? (
        <Card className="overflow-hidden">
          <EmptyState
            icon={<GraduationCap className="h-6 w-6" />}
            title={
              search || filter !== "all"
                ? "لا يوجد معلمون مطابقون للبحث"
                : "لا يوجد معلمون مسجّلون"
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
                      المعلم
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
                  {filteredTeachers.map((teacher) => (
                    <tr
                      key={teacher.id}
                      className="group transition hover:bg-slate-50/70"
                    >
                      {/* Teacher */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 font-extrabold text-purple-600">
                            {teacher.full_name
                              ?.charAt(0)
                              ?.toUpperCase() || "؟"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-extrabold text-slate-800">
                              {teacher.full_name ||
                                "معلم غير معروف"}
                            </p>

                            <div className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                              <Mail className="h-3.5 w-3.5" />

                              <span className="truncate">
                                {teacher.email || "لا يوجد بريد"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* College */}
                      <td className="px-5 py-4">
                        <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                          {COLLEGE_LABELS[teacher.college] ||
                            "غير محددة"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2 text-slate-500">
                          <CalendarDays className="h-4 w-4 text-slate-400" />
                          <span>
                            {formatDate(teacher.created_at)}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <Badge
                          color={
                            STATUS_COLORS[teacher.status] ||
                            "amber"
                          }
                        >
                          {STATUS_LABELS[teacher.status] ||
                            teacher.status}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-5 py-4">
                        {teacher.status !==
                        "pending_verification" ? (
                          <Button
                            size="sm"
                            variant={
                              teacher.status === "suspended"
                                ? "secondary"
                                : "outline"
                            }
                            isLoading={
                              processingId === teacher.id
                            }
                            onClick={() =>
                              toggleStatus(teacher)
                            }
                          >
                            {teacher.status === "suspended" ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <Ban className="h-3.5 w-3.5 text-red-500" />
                            )}

                            {teacher.status === "suspended"
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
            {filteredTeachers.map((teacher) => (
              <Card
                key={teacher.id}
                className="relative overflow-hidden p-4"
              >
                <div
                  className={`absolute inset-y-0 right-0 w-1 ${
                    teacher.status === "active"
                      ? "bg-emerald-500"
                      : teacher.status === "suspended"
                        ? "bg-red-500"
                        : "bg-amber-500"
                  }`}
                />

                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 font-extrabold text-purple-600">
                    {teacher.full_name
                      ?.charAt(0)
                      ?.toUpperCase() || "؟"}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-extrabold text-slate-800">
                          {teacher.full_name ||
                            "معلم غير معروف"}
                        </p>

                        <p className="mt-1 truncate text-xs text-slate-400">
                          {teacher.email || "لا يوجد بريد"}
                        </p>
                      </div>

                      <Badge
                        color={
                          STATUS_COLORS[teacher.status] ||
                          "amber"
                        }
                      >
                        {STATUS_LABELS[teacher.status] ||
                          teacher.status}
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
                      {COLLEGE_LABELS[teacher.college] ||
                        "غير محددة"}
                    </p>
                  </div>

                  <div className="rounded-xl bg-slate-50 p-3">
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <CalendarDays className="h-3.5 w-3.5" />
                      التسجيل
                    </div>

                    <p className="mt-1 text-sm font-bold text-slate-700">
                      {formatDate(teacher.created_at)}
                    </p>
                  </div>
                </div>

                {teacher.status !==
                  "pending_verification" && (
                  <Button
                    size="sm"
                    variant={
                      teacher.status === "suspended"
                        ? "secondary"
                        : "outline"
                    }
                    isLoading={
                      processingId === teacher.id
                    }
                    onClick={() => toggleStatus(teacher)}
                    className="mt-3 w-full"
                  >
                    {teacher.status === "suspended" ? (
                      <CheckCircle2 className="h-4 w-4" />
                    ) : (
                      <Ban className="h-4 w-4 text-red-500" />
                    )}

                    {teacher.status === "suspended"
                      ? "تفعيل حساب المعلم"
                      : "إيقاف حساب المعلم"}
                  </Button>
                )}
              </Card>
            ))}
          </div>
        </>
      )}

      {!loading && filteredTeachers.length > 0 && (
        <p className="text-center text-xs text-slate-400">
          عرض {filteredTeachers.length} من أصل {teachers.length} معلم
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