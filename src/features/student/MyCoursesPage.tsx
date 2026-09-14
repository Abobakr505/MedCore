import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  PlayCircle,
  GraduationCap,
  ArrowLeft,
  Sparkles,
  Clock3,
  CheckCircle2,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/contexts/AuthContext";
import { fetchStudentEnrollments } from "@/services/enrollments";

import type { Enrollment } from "@/types";
import { getPublicUrl } from "@/lib/supabase";

export default function MyCoursesPage() {
  const { session } = useAuth();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session?.user) return;

    setLoading(true);

    fetchStudentEnrollments(session.user.id)
      .then(setEnrollments)
      .finally(() => setLoading(false));
  }, [session?.user?.id]);

  return (
    <div className="min-h-full space-y-8 pb-10">
      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-600 p-6 text-white shadow-xl sm:p-8"
      >
        <div className="absolute -left-20 -top-20 h-48 w-48 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-24 right-10 h-56 w-56 rounded-full bg-brand-300/10 blur-3xl" />

        <div className="relative flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold backdrop-blur">
              <Sparkles className="h-3.5 w-3.5" />
              رحلتك التعليمية
            </div>

            <h1 className="text-3xl font-black sm:text-4xl">
              كورساتي
            </h1>

            <p className="mt-2 max-w-xl text-sm leading-7 text-white/70">
              كل الكورسات التي التحقت بها في مكان واحد. واصل التعلم، أكمل
              دروسك، وحقق أهدافك التعليمية خطوة بخطوة.
            </p>
          </div>

          <div className="hidden h-24 w-24 items-center justify-center rounded-3xl bg-white/10 backdrop-blur md:flex">
            <GraduationCap className="h-12 w-12" />
          </div>
        </div>
      </motion.div>

      {/* Count */}
      {!loading && enrollments.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <BookOpen className="h-5 w-5" />
            </div>

            <div>
              <p className="text-xs text-slate-400">الكورسات المسجل بها</p>
              <p className="font-black text-slate-900">
                {enrollments.length} كورس
              </p>
            </div>
          </div>

          <span className="hidden rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600 sm:block">
            استمر في التعلم 🚀
          </span>
        </div>
      )}

      {/* Courses */}
      {loading ? (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-80 rounded-3xl" />
          ))}
        </div>
      ) : enrollments.length === 0 ? (
        <Card className="rounded-3xl border-slate-100">
          <div className="bg-gradient-to-br from-brand-50 to-white p-8 sm:p-12">
            <EmptyState
              icon={<BookOpen className="h-7 w-7" />}
              title="لم تشترك في أي كورس بعد"
              description="ابدأ رحلتك التعليمية واكتشف الكورسات المتاحة لك."
              action={
                <Link to="/courses">
                  <Button>
                    تصفّح الكورسات
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </Link>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {enrollments.map((enrollment, index) => {
            const thumb = getPublicUrl(
              "course-thumbnails",
              enrollment.course?.thumbnail_path ?? null
            );

            return (
              <motion.div
                key={enrollment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.35,
                  delay: index * 0.05,
                }}
              >
                <Card className="group h-full overflow-hidden rounded-3xl border-slate-100 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-100 hover:shadow-xl">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={enrollment.course?.title ?? "Course"}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-14 w-14 text-white/30" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

                    <div className="absolute right-4 top-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black text-brand-700 shadow-sm backdrop-blur">
                      مسجل حاليًا
                    </div>

                    <div className="absolute bottom-4 right-4 left-4">
                      <p className="text-[11px] font-semibold text-white/70">
                        كورس تعليمي
                      </p>

                      <h2 className="mt-1 line-clamp-2 text-lg font-black leading-7 text-white">
                        {enrollment.course?.title}
                      </h2>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <GraduationCap className="h-4 w-4" />

                      <span className="truncate">
                        {enrollment.course?.teacher?.full_name ??
                          "المعلم"}
                      </span>
                    </div>

                    <div className="mt-5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500">
                          تقدمك
                        </span>

                        <span className="font-black text-brand-600">
                          ابدأ المتابعة
                        </span>
                      </div>

                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full w-0 rounded-full bg-brand-500" />
                      </div>
                    </div>

                    <Link
                      to={`/app/student/courses/${enrollment.course_id}/learn`}
                    >
                      <Button className="mt-5 w-full">
                        <PlayCircle className="h-4 w-4" />
                        متابعة التعلّم
                        <ArrowLeft className="mr-auto h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
