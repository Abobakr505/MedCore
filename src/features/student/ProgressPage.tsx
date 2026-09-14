import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  TrendingUp,
  BookOpen,
  CheckCircle2,
  Circle,
  Trophy,
  ArrowLeft,
  Sparkles,
  GraduationCap,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/contexts/AuthContext";
import {
  fetchStudentEnrollments,
  fetchLessonProgress,
  computeCourseProgress,
} from "@/services/enrollments";
import { fetchCourseSections } from "@/services/courses";

interface CourseProgressRow {
  courseId: string;
  title: string;
  progress: number;
  totalLessons: number;
  completedLessons: number;
}

export default function ProgressPage() {
  const { session } = useAuth();

  const [rows, setRows] = useState<CourseProgressRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    let mounted = true;

    (async () => {
      try {
        setLoading(true);

        const enrollments = await fetchStudentEnrollments(
          session.user.id
        );

        const results: CourseProgressRow[] = [];

        for (const enrollment of enrollments) {
          if (!enrollment.course) continue;

          const sections = await fetchCourseSections(
            enrollment.course.id
          );

          const lessons = sections.flatMap(
            (section) => section.lessons ?? []
          );

          const progress = await fetchLessonProgress(
            session.user.id,
            lessons.map((lesson) => lesson.id)
          );

          const completed = progress.filter(
            (item) => item.completed
          ).length;

          results.push({
            courseId: enrollment.course.id,
            title: enrollment.course.title,
            totalLessons: lessons.length,
            completedLessons: completed,
            progress: computeCourseProgress(
              lessons.length,
              completed
            ),
          });
        }

        if (mounted) setRows(results);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const stats = useMemo(() => {
    const totalLessons = rows.reduce(
      (sum, row) => sum + row.totalLessons,
      0
    );

    const completedLessons = rows.reduce(
      (sum, row) => sum + row.completedLessons,
      0
    );

    const average =
      rows.length > 0
        ? Math.round(
            rows.reduce((sum, row) => sum + row.progress, 0) /
              rows.length
          )
        : 0;

    const completedCourses = rows.filter(
      (row) => row.progress >= 100
    ).length;

    return {
      totalCourses: rows.length,
      totalLessons,
      completedLessons,
      average,
      completedCourses,
    };
  }, [rows]);

  const getStatus = (progress: number) => {
    if (progress >= 100) {
      return {
        label: "مكتمل",
        icon: Trophy,
        className: "bg-emerald-50 text-emerald-600",
      };
    }

    if (progress > 0) {
      return {
        label: "قيد التقدم",
        icon: TrendingUp,
        className: "bg-brand-50 text-brand-600",
      };
    }

    return {
      label: "لم يبدأ",
      icon: Circle,
      className: "bg-slate-100 text-slate-500",
    };
  };

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white shadow-xl sm:p-8"
      >
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />

        <div className="relative flex items-center justify-between gap-6">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              تطورك التعليمي
            </div>

            <h1 className="text-3xl font-black sm:text-4xl">
              تقدّمي الدراسي
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-7 text-white/70">
              تابع مستوى إنجازك في كل كورس واعرف بالضبط أين وصلت في رحلتك
              التعليمية.
            </p>
          </div>

          <div className="hidden h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur md:flex">
            <TrendingUp className="h-12 w-12" />
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      {!loading && rows.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<BookOpen className="h-5 w-5" />}
            label="الكورسات"
            value={stats.totalCourses}
            description="كورس مسجل"
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            label="الدروس المكتملة"
            value={stats.completedLessons}
            description={`من ${stats.totalLessons} درس`}
          />

          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            label="متوسط التقدم"
            value={`${stats.average}%`}
            description="متوسط إنجازك"
          />

          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            label="الكورسات المكتملة"
            value={stats.completedCourses}
            description="إنجازات مكتملة"
          />
        </div>
      )}

      {/* Overall */}
      {!loading && rows.length > 0 && (
        <Card className="overflow-hidden rounded-3xl border-slate-100 shadow-sm">
          <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
            <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
              <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
                <path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  className="text-slate-100"
                />

                <motion.path
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="text-brand-500"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: stats.average / 100 }}
                  transition={{ duration: 1 }}
                />
              </svg>

              <span className="text-lg font-black text-slate-900">
                {stats.average}%
              </span>
            </div>

            <div className="flex-1">
              <h2 className="text-lg font-black text-slate-900">
                متوسط تقدمك الدراسي
              </h2>

              <p className="mt-1 text-sm leading-6 text-slate-400">
                كل درس تنهيه يقربك أكثر من إكمال أهدافك. استمر ولا تتوقف!
              </p>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-l from-brand-400 to-brand-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.average}%` }}
                  transition={{ duration: 0.8 }}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Courses */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card className="rounded-3xl border-slate-100">
          <div className="p-8 sm:p-12">
            <EmptyState
              icon={<TrendingUp className="h-7 w-7" />}
              title="لا يوجد تقدّم مسجّل بعد"
              description="ابدأ أحد الكورسات المسجل بها ليظهر تقدمك هنا."
            />
          </div>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              تقدم الكورسات
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              تفاصيل إنجازك في كل كورس
            </p>
          </div>

          <div className="space-y-4">
            {rows.map((row, index) => {
              const status = getStatus(row.progress);
              const StatusIcon = status.icon;

              return (
                <motion.div
                  key={row.courseId}
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.35,
                    delay: index * 0.05,
                  }}
                >
                  <Card className="group rounded-3xl border-slate-100 p-5 shadow-sm transition-all hover:border-brand-100 hover:shadow-lg sm:p-6">
                    <div className="flex flex-col gap-5 md:flex-row md:items-center">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                        {row.progress >= 100 ? (
                          <Trophy className="h-6 w-6" />
                        ) : (
                          <GraduationCap className="h-6 w-6" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            to={`/app/student/courses/${row.courseId}/learn`}
                            className="truncate font-black text-slate-900 transition hover:text-brand-600"
                          >
                            {row.title}
                          </Link>

                          <span
                            className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${status.className}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </span>
                        </div>

                        <div className="mt-4">
                          <div className="mb-2 flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                              {row.completedLessons} من{" "}
                              {row.totalLessons} دروس مكتملة
                            </span>

                            <span className="font-black text-brand-600">
                              {row.progress}%
                            </span>
                          </div>

                          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              className={`h-full rounded-full ${
                                row.progress >= 100
                                  ? "bg-emerald-500"
                                  : "bg-brand-500"
                              }`}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${row.progress}%`,
                              }}
                              transition={{
                                duration: 0.8,
                                delay: 0.1,
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <Link
                        to={`/app/student/courses/${row.courseId}/learn`}
                        className="shrink-0"
                      >
                        <Button variant="outline" size="sm">
                          متابعة
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-3xl border-slate-100 p-5 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-brand-50 transition-transform duration-500 group-hover:scale-150" />

      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {icon}
        </div>

        <p className="mt-5 text-xs font-semibold text-slate-400">
          {label}
        </p>

        <p className="mt-1 text-2xl font-black text-slate-900">
          {value}
        </p>

        <p className="mt-1 text-[11px] text-slate-400">
          {description}
        </p>
      </div>
    </Card>
  );
}
