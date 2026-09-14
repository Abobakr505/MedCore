import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ClipboardList,
  Clock3,
  ArrowLeft,
  Sparkles,
  Target,
  Trophy,
  BookOpen,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentEnrollments } from "@/services/enrollments";
import { fetchCourseQuizzes } from "@/services/quizzes";

import type { Quiz } from "@/types";

interface QuizRow extends Quiz {
  courseTitle: string;
}

export default function QuizzesListPage() {
  const { session } = useAuth();

  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
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

        const all: QuizRow[] = [];

        for (const enrollment of enrollments) {
          if (!enrollment.course) continue;

          const list = await fetchCourseQuizzes(
            enrollment.course.id
          );

          list.forEach((quiz) => {
            all.push({
              ...quiz,
              courseTitle: enrollment.course!.title,
            });
          });
        }

        if (mounted) setQuizzes(all);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [session?.user?.id]);

  const totalDuration = useMemo(
    () =>
      quizzes.reduce(
        (sum, quiz) => sum + Number(quiz.duration_minutes ?? 0),
        0
      ),
    [quizzes]
  );

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* Hero */}
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
              اختبر معلوماتك
            </div>

            <h1 className="text-3xl font-black sm:text-4xl">
              الاختبارات
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-7 text-white/70">
              اختبر فهمك للدروس، راقب مستواك، وحاول الوصول إلى أفضل نتيجة
              ممكنة.
            </p>
          </div>

          <div className="hidden h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur md:flex">
            <ClipboardList className="h-12 w-12" />
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      {!loading && quizzes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <MiniStat
            icon={<ClipboardList className="h-5 w-5" />}
            label="الاختبارات المتاحة"
            value={quizzes.length}
          />

          <MiniStat
            icon={<Clock3 className="h-5 w-5" />}
            label="إجمالي الوقت"
            value={`${totalDuration} دقيقة`}
          />

          <MiniStat
            icon={<Target className="h-5 w-5" />}
            label="الاختبارات بانتظارك"
            value={quizzes.length}
          />
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-36 rounded-3xl" />
          ))}
        </div>
      ) : quizzes.length === 0 ? (
        <Card className="rounded-3xl border-slate-100">
          <div className="p-8 sm:p-12">
            <EmptyState
              icon={<ClipboardList className="h-7 w-7" />}
              title="لا توجد اختبارات متاحة حاليًا"
              description="ستظهر هنا الاختبارات فور إضافتها من المعلم لكورساتك."
            />
          </div>
        </Card>
      ) : (
        <div>
          <div className="mb-4">
            <h2 className="text-xl font-black text-slate-900">
              الاختبارات المتاحة
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              اختر اختبارًا وابدأ تحدي نفسك
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            {quizzes.map((quiz, index) => (
              <motion.div
                key={quiz.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.05,
                }}
              >
                <Card className="group relative overflow-hidden rounded-3xl border-slate-100 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-100 hover:shadow-xl">
                  <div className="p-5 sm:p-6">
                    <div className="flex gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-500 group-hover:text-white">
                        <ClipboardList className="h-6 w-6" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="truncate font-black text-slate-900">
                            {quiz.title}
                          </h3>

                          <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                            جديد
                          </span>
                        </div>

                        <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <BookOpen className="h-3.5 w-3.5" />
                          {quiz.courseTitle}
                        </p>
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <InfoItem
                        icon={<Clock3 className="h-3.5 w-3.5" />}
                        label="المدة"
                        value={`${quiz.duration_minutes} دقيقة`}
                      />

                      <InfoItem
                        icon={<Target className="h-3.5 w-3.5" />}
                        label="درجة النجاح"
                        value={`${quiz.passing_score}%`}
                      />

                      <InfoItem
                        icon={<Trophy className="h-3.5 w-3.5" />}
                        label="الحالة"
                        value="متاح"
                      />
                    </div>

                    <Link
                      to={`/app/student/quizzes/${quiz.id}`}
                      className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-600"
                    >
                      بدء الاختبار
                      <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
                    </Link>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) {
  return (
    <Card className="rounded-3xl border-slate-100 p-5 shadow-sm">
      <div className="flex items-center gap-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
          {icon}
        </div>

        <div>
          <p className="text-xs text-slate-400">{label}</p>
          <p className="mt-1 font-black text-slate-900">{value}</p>
        </div>
      </div>
    </Card>
  );
}

function InfoItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
        {icon}
        {label}
      </div>

      <p className="mt-1 text-xs font-black text-slate-700">
        {value}
      </p>
    </div>
  );
}
