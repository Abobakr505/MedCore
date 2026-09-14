import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Award,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Target,
  Trophy,
  ClipboardCheck,
  CalendarDays,
  ArrowUpLeft,
  Sparkles,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentAttempts } from "@/services/quizzes";
import type { QuizAttempt } from "@/types";
import { formatDateTime } from "@/utils/format";

export default function GradesPage() {
  const { session } = useAuth();

  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    setLoading(true);

    fetchStudentAttempts(session.user.id)
      .then(setAttempts)
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  const stats = useMemo(() => {
    if (!attempts.length) {
      return {
        total: 0,
        passed: 0,
        failed: 0,
        average: 0,
        highest: 0,
      };
    }

    const percentages = attempts.map((a: any) => Number(a.percentage ?? 0));

    const passed = attempts.filter((a: any) => {
      const percentage = Number(a.percentage ?? 0);
      const passingScore = Number(a.quiz?.passing_score ?? 60);

      return percentage >= passingScore;
    }).length;

    const average =
      percentages.reduce((sum, value) => sum + value, 0) / percentages.length;

    return {
      total: attempts.length,
      passed,
      failed: attempts.length - passed,
      average: Math.round(average),
      highest: Math.max(...percentages),
    };
  }, [attempts]);

  const getGradeLevel = (percentage: number) => {
    if (percentage >= 90) {
      return {
        label: "ممتاز",
        description: "أداء رائع جدًا",
        icon: Trophy,
      };
    }

    if (percentage >= 80) {
      return {
        label: "جيد جدًا",
        description: "استمر بهذا المستوى",
        icon: Award,
      };
    }

    if (percentage >= 70) {
      return {
        label: "جيد",
        description: "أداء جيد ويمكنك الأفضل",
        icon: TrendingUp,
      };
    }

    if (percentage >= 60) {
      return {
        label: "مقبول",
        description: "لقد اجتزت الاختبار",
        icon: CheckCircle2,
      };
    }

    return {
      label: "يحتاج تحسين",
      description: "راجع الدروس وحاول مرة أخرى",
      icon: Target,
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
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-20 right-10 h-52 w-52 rounded-full bg-brand-300/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              سجل الأداء الأكاديمي
            </div>

            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              درجاتي
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-7 text-white/70">
              تابع نتائج اختباراتك، راقب تطور مستواك، واعرف نقاط القوة التي
              تحتاج إلى المحافظة عليها والجوانب التي تحتاج إلى تحسينها.
            </p>
          </div>

          <div className="hidden h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur md:flex">
            <Award className="h-12 w-12 text-white" />
          </div>
        </div>
      </motion.div>

      {/* Statistics */}
      {!loading && attempts.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            icon={<ClipboardCheck className="h-5 w-5" />}
            title="إجمالي الاختبارات"
            value={stats.total}
            subtitle="اختبار تم أداؤه"
            delay={0}
          />

          <StatCard
            icon={<TrendingUp className="h-5 w-5" />}
            title="متوسط الدرجات"
            value={`${stats.average}%`}
            subtitle="متوسط أدائك"
            delay={0.05}
          />

          <StatCard
            icon={<CheckCircle2 className="h-5 w-5" />}
            title="اختبارات ناجحة"
            value={stats.passed}
            subtitle={`${stats.total ? Math.round((stats.passed / stats.total) * 100) : 0}% من الاختبارات`}
            delay={0.1}
          />

          <StatCard
            icon={<Trophy className="h-5 w-5" />}
            title="أعلى درجة"
            value={`${stats.highest}%`}
            subtitle="أفضل نتيجة حققتها"
            delay={0.15}
          />
        </div>
      )}

      {/* Loading */}
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
          <Skeleton className="h-32 rounded-3xl" />
        </div>
      ) : attempts.length === 0 ? (
        <Card className="overflow-hidden rounded-3xl border-slate-100">
          <div className="bg-gradient-to-br from-brand-50 to-white p-8 sm:p-12">
            <EmptyState
              icon={<Award className="h-7 w-7" />}
              title="لم تؤدِ أي اختبار بعد"
              description="عندما تبدأ أول اختبار لك، ستظهر نتائجك وتفاصيل أدائك هنا."
              action={
                <Button>
                  استكشف الاختبارات
                  <ArrowUpLeft className="h-4 w-4" />
                </Button>
              }
            />
          </div>
        </Card>
      ) : (
        <>
          {/* Performance Summary */}
          <Card className="overflow-hidden rounded-3xl border-slate-100 shadow-sm">
            <div className="border-b border-slate-100 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    ملخص أدائك
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    نظرة سريعة على مستواك في الاختبارات
                  </p>
                </div>

                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                  <TrendingUp className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="grid divide-y divide-slate-100 sm:grid-cols-3 sm:divide-x sm:divide-y-0 rtl:sm:divide-x-reverse">
              <SummaryItem
                label="متوسط الدرجات"
                value={`${stats.average}%`}
              />

              <SummaryItem
                label="اختبارات ناجحة"
                value={`${stats.passed} اختبار`}
              />

              <SummaryItem
                label="اختبارات تحتاج مراجعة"
                value={`${stats.failed} اختبار`}
              />
            </div>
          </Card>

          {/* Attempts */}
          <div>
            <div className="mb-4 flex items-end justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900">
                  سجل الاختبارات
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  جميع نتائج اختباراتك السابقة
                </p>
              </div>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-500">
                {attempts.length} نتيجة
              </span>
            </div>

            <div className="space-y-4">
              {attempts.map((attempt: any, index) => {
                const percentage = Number(attempt.percentage ?? 0);

                const passingScore = Number(
                  attempt.quiz?.passing_score ?? 60
                );

                const passed = percentage >= passingScore;

                const grade = getGradeLevel(percentage);
                const GradeIcon = grade.icon;

                return (
                  <motion.div
                    key={attempt.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      duration: 0.35,
                      delay: index * 0.05,
                    }}
                  >
                    <Card className="group overflow-hidden rounded-3xl border-slate-100 p-0 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-100 hover:shadow-lg">
                      <div className="p-5 sm:p-6">
                        <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
                          {/* Icon */}
                          <div
                            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${
                              passed
                                ? "bg-emerald-50 text-emerald-600"
                                : "bg-red-50 text-red-500"
                            }`}
                          >
                            {passed ? (
                              <CheckCircle2 className="h-7 w-7" />
                            ) : (
                              <XCircle className="h-7 w-7" />
                            )}
                          </div>

                          {/* Info */}
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="truncate font-extrabold text-slate-900">
                                {attempt.quiz?.title ?? "اختبار بدون عنوان"}
                              </h3>

                              <Badge color={passed ? "green" : "red"}>
                                {passed ? "ناجح" : "راسب"}
                              </Badge>
                            </div>

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-400">
                              <span className="flex items-center gap-1.5">
                                <CalendarDays className="h-3.5 w-3.5" />
                                {formatDateTime(attempt.submitted_at)}
                              </span>

                              {attempt.quiz?.passing_score != null && (
                                <span>
                                  درجة النجاح: {passingScore}%
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Score */}
                          <div className="flex items-center gap-5 lg:min-w-[210px] lg:justify-end">
                            <div className="hidden text-right sm:block">
                              <div className="flex items-center justify-end gap-1.5 text-xs font-bold text-slate-500">
                                <GradeIcon className="h-3.5 w-3.5" />
                                {grade.label}
                              </div>

                              <p className="mt-1 text-[11px] text-slate-400">
                                {grade.description}
                              </p>
                            </div>

                            <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-slate-50">
                              <svg
                                className="absolute inset-0 h-full w-full -rotate-90"
                                viewBox="0 0 36 36"
                              >
                                <path
                                  d="M18 2.0845
                                     a 15.9155 15.9155 0 0 1 0 31.831
                                     a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  className="text-slate-100"
                                />

                                <motion.path
                                  d="M18 2.0845
                                     a 15.9155 15.9155 0 0 1 0 31.831
                                     a 15.9155 15.9155 0 0 1 0 -31.831"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="3"
                                  strokeLinecap="round"
                                  className={
                                    passed
                                      ? "text-emerald-500"
                                      : "text-red-400"
                                  }
                                  initial={{ pathLength: 0 }}
                                  animate={{
                                    pathLength: Math.min(
                                      Math.max(percentage / 100, 0),
                                      1
                                    ),
                                  }}
                                  transition={{
                                    duration: 0.8,
                                    ease: "easeOut",
                                  }}
                                />
                              </svg>

                              <span className="relative text-sm font-black text-slate-800">
                                {percentage}%
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Progress */}
                        <div className="mt-5">
                          <div className="mb-2 flex items-center justify-between text-[11px]">
                            <span className="font-semibold text-slate-400">
                              النتيجة
                            </span>

                            <span className="font-bold text-slate-500">
                              {percentage} من 100
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <motion.div
                              className={`h-full rounded-full ${
                                passed
                                  ? "bg-gradient-to-l from-emerald-400 to-emerald-600"
                                  : "bg-gradient-to-l from-red-400 to-red-500"
                              }`}
                              initial={{ width: 0 }}
                              animate={{
                                width: `${Math.min(
                                  Math.max(percentage, 0),
                                  100
                                )}%`,
                              }}
                              transition={{
                                duration: 0.8,
                                delay: 0.1,
                                ease: "easeOut",
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  subtitle,
  delay = 0,
}: {
  icon: React.ReactNode;
  title: string;
  value: string | number;
  subtitle: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
    >
      <Card className="group relative overflow-hidden rounded-3xl border-slate-100 p-5 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg">
        <div className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-brand-50 opacity-60 transition-transform duration-500 group-hover:scale-150" />

        <div className="relative">
          <div className="flex items-start justify-between">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              {icon}
            </div>

            <ArrowUpLeft className="h-4 w-4 text-slate-200 transition-transform group-hover:-translate-y-0.5 group-hover:-translate-x-0.5" />
          </div>

          <p className="mt-5 text-xs font-semibold text-slate-400">
            {title}
          </p>

          <p className="mt-1 text-2xl font-black text-slate-900">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">{subtitle}</p>
        </div>
      </Card>
    </motion.div>
  );
}

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-xs font-semibold text-slate-400">{label}</p>
      <p className="mt-2 text-xl font-black text-slate-900">{value}</p>
    </div>
  );
}
