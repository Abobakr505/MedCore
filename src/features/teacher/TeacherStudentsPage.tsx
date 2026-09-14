import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  GraduationCap,
  Users,
  Search,
  Mail,
  BookOpen,
  CalendarDays,
  UserCheck,
  UserX,
  ChevronDown,
  TrendingUp,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import { supabase } from "@/lib/supabase";

import {
  ENROLLMENT_STATUS_LABELS,
} from "@/types";

import { formatDate } from "@/utils/format";

interface StudentRow {
  id: string;
  student_id: string;
  status: string;
  enrolled_at: string | null;
  student: {
    full_name: string;
    email: string;
  } | null;
  course: {
    title: string;
  } | null;
}

export default function TeacherStudentsPage() {
  const { session } = useAuth();
  const { showToast } = useToast();

  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("all");

  useEffect(() => {
    if (!session?.user) return;

    const loadStudents = async () => {
      setLoading(true);

      try {
        const { data, error } = await supabase
          .from("enrollments")
          .select(
            "id, student_id, status, enrolled_at, student:profiles(full_name, email), course:courses!inner(title, teacher_id)"
          )
          .eq(
            "course.teacher_id",
            session.user.id
          )
          .order("enrolled_at", {
            ascending: false,
          });

        if (error) throw error;

        setRows(
          (data ?? []) as unknown as StudentRow[]
        );
      } catch {
        showToast(
          "تعذّر تحميل قائمة الطلاب",
          "error"
        );
      } finally {
        setLoading(false);
      }
    };

    loadStudents();
  }, [session?.user?.id, showToast]);

  const stats = useMemo(() => {
    const active = rows.filter(
      (r) => r.status === "active"
    ).length;

    const inactive = rows.length - active;

    const uniqueStudents = new Set(
      rows.map((r) => r.student_id)
    ).size;

    const uniqueCourses = new Set(
      rows
        .map((r) => r.course?.title)
        .filter(Boolean)
    ).size;

    return {
      total: rows.length,
      active,
      inactive,
      uniqueStudents,
      uniqueCourses,
    };
  }, [rows]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "all" ||
        row.status === statusFilter;

      const matchesSearch =
        !query ||
        row.student?.full_name
          ?.toLowerCase()
          .includes(query) ||
        row.student?.email
          ?.toLowerCase()
          .includes(query) ||
        row.course?.title
          ?.toLowerCase()
          .includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [rows, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-brand-950 to-brand-700 p-6 text-white shadow-xl">
        <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-sm text-white/70">
              <GraduationCap className="h-4 w-4" />
              إدارة الطلاب
            </div>

            <h1 className="mt-2 text-3xl font-black">
              طلابي
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-6 text-white/70">
              تابع جميع الطلاب المشتركين في كورساتك،
              واعرف الكورسات والحالة وتاريخ الاشتراك بسهولة.
            </p>
          </div>

          <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-white/10 backdrop-blur">
            <Users className="h-8 w-8" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StudentStat
          icon={<Users />}
          value={stats.uniqueStudents}
          label="إجمالي الطلاب"
          tone="brand"
        />

        <StudentStat
          icon={<UserCheck />}
          value={stats.active}
          label="اشتراكات نشطة"
          tone="green"
        />

        <StudentStat
          icon={<UserX />}
          value={stats.inactive}
          label="غير نشطة"
          tone="red"
        />

        <StudentStat
          icon={<BookOpen />}
          value={stats.uniqueCourses}
          label="كورسات بها طلاب"
          tone="blue"
        />
      </div>

      {/* Search */}
      <div className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

            <input
              value={search}
              onChange={(e) =>
                setSearch(e.target.value)
              }
              placeholder="ابحث باسم الطالب، البريد أو الكورس..."
              className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pr-10 pl-4 text-sm outline-none transition focus:border-brand-400 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
            />
          </div>

          <div className="flex gap-2">
            {[
              ["all", "الكل"],
              ["active", "نشط"],
              ["inactive", "غير نشط"],
            ].map(([value, label]) => (
              <button
                key={value}
                onClick={() =>
                  setStatusFilter(value)
                }
                className={`rounded-xl px-4 py-2 text-sm font-bold transition ${
                  statusFilter === value
                    ? "bg-brand-500 text-white"
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Desktop table */}
      <div className="hidden overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm lg:block">
        {loading ? (
          <div className="space-y-3 p-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-14 rounded-xl"
              />
            ))}
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={<GraduationCap className="h-7 w-7" />}
              title="لا يوجد طلاب مطابقون"
            />
          </div>
        ) : (
          <>
            <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-slate-800">
                    قائمة الطلاب
                  </h2>

                  <p className="mt-1 text-xs text-slate-400">
                    {filteredRows.length} اشتراك
                  </p>
                </div>

                <div className="flex items-center gap-2 text-xs text-cyan-600">
                  <TrendingUp className="h-4 w-4" />
                  بيانات محدثة
                </div>
              </div>
            </div>

            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-right text-xs font-bold text-slate-500">
                <tr>
                  <th className="px-5 py-4">
                    الطالب
                  </th>

                  <th className="px-5 py-4">
                    الكورس
                  </th>

                  <th className="px-5 py-4">
                    تاريخ الاشتراك
                  </th>

                  <th className="px-5 py-4">
                    الحالة
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {filteredRows.map((row, index) => (
                  <motion.tr
                    key={row.id}
                    initial={{
                      opacity: 0,
                      y: 5,
                    }}
                    animate={{
                      opacity: 1,
                      y: 0,
                    }}
                    transition={{
                      delay: index * 0.02,
                    }}
                    className="group transition hover:bg-slate-50/80"
                  >
                    <td className="px-5 py-4">
                      <StudentIdentity
                        student={row.student}
                      />
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <div className="rounded-lg bg-brand-50 p-2 text-brand-500">
                          <BookOpen className="h-3.5 w-3.5" />
                        </div>

                        <span className="font-medium text-slate-700">
                          {row.course?.title ||
                            "غير معروف"}
                        </span>
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarDays className="h-4 w-4 text-slate-400" />
                        {formatDate(row.enrolled_at)}
                      </div>
                    </td>

                    <td className="px-5 py-4">
                      <Badge
                        color={
                          row.status === "active"
                            ? "green"
                            : "slate"
                        }
                      >
                        {ENROLLMENT_STATUS_LABELS[
                          row.status
                        ] || row.status}
                      </Badge>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Mobile cards */}
      <div className="space-y-3 lg:hidden">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-36 rounded-2xl"
            />
          ))
        ) : filteredRows.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white p-10">
            <EmptyState
              icon={<GraduationCap className="h-7 w-7" />}
              title="لا يوجد طلاب مطابقون"
            />
          </div>
        ) : (
          filteredRows.map((row, index) => (
            <motion.div
              key={row.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: index * 0.03,
              }}
            >
              <StudentMobileCard row={row} />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

function StudentIdentity({
  student,
}: {
  student: StudentRow["student"];
}) {
  const name =
    student?.full_name || "طالب غير معروف";

  const initial = name.charAt(0);

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-cyan-400 text-sm font-black text-white shadow-sm">
        {initial}
      </div>

      <div className="min-w-0">
        <p className="font-bold text-slate-800">
          {name}
        </p>

        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-400">
          <Mail className="h-3 w-3" />
          {student?.email}
        </p>
      </div>
    </div>
  );
}

function StudentMobileCard({
  row,
}: {
  row: StudentRow;
}) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <StudentIdentity
            student={row.student}
          />

          <Badge
            color={
              row.status === "active"
                ? "green"
                : "slate"
            }
          >
            {ENROLLMENT_STATUS_LABELS[
              row.status
            ] || row.status}
          </Badge>
        </div>

        <div className="mt-4 rounded-xl bg-slate-50 p-3">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <BookOpen className="h-4 w-4 text-brand-500" />

            <span className="font-semibold">
              {row.course?.title ||
                "كورس غير معروف"}
            </span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs text-slate-400">
            <CalendarDays className="h-4 w-4" />
            تاريخ الاشتراك:
            <span className="font-medium">
              {formatDate(row.enrolled_at)}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-4 py-3 text-xs text-slate-400">
        <span>Student ID</span>

        <span className="font-mono">
          {row.student_id.slice(0, 10)}...
        </span>
      </div>
    </Card>
  );
}

function StudentStat({
  icon,
  value,
  label,
  tone,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  tone: "brand" | "green" | "red" | "blue";
}) {
  const colors = {
    brand: "bg-brand-50 text-brand-500",
    green: "bg-cyan-50 text-cyan-500",
    red: "bg-red-50 text-red-500",
    blue: "bg-blue-50 text-blue-500",
  };

  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div
          className={`rounded-xl p-2.5 ${colors[tone]}`}
        >
          {icon}
        </div>

        <span className="text-xl font-black text-slate-800">
          {value}
        </span>
      </div>

      <p className="mt-3 text-xs font-bold text-slate-500">
        {label}
      </p>
    </div>
  );
}