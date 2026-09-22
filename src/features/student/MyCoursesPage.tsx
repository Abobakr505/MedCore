import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  PlayCircle,
  GraduationCap,
  ArrowLeft,
  Sparkles,
  Bell,
  X,
  Compass,
  Clock,
  CheckCircle2,
  Flame,
} from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

import { useAuth } from "@/contexts/AuthContext";
import {
  computeCourseProgress,
  fetchLessonProgress,
  fetchStudentEnrollments,
} from "@/services/enrollments";
import { fetchCourseSections } from "@/services/courses";

import type { Enrollment } from "@/types";
import { getPublicUrl, supabase } from "@/lib/supabase";

type CourseProgress = {
  completedLessons: number;
  totalLessons: number;
  percentage: number;
};

type NewCourseAlert = {
  id: string;
  title: string;
  slug: string;
  college: string;
};

const NEW_COURSE_SEEN_KEY = "last_seen_course_id";

export default function MyCoursesPage() {
  const { session } = useAuth();

  const [enrollments, setEnrollments] = useState<Enrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [courseProgress, setCourseProgress] = useState<Record<string, CourseProgress>>({});

  const [newCourseAlert, setNewCourseAlert] =
    useState<NewCourseAlert | null>(null);

  /* =========================================================
     Load enrollments + progress
  ========================================================= */
  useEffect(() => {
    if (!session?.user) return;

    let active = true;

    setLoading(true);

    (async () => {
      try {
        const data = await fetchStudentEnrollments(session.user.id);
        const progressMap: Record<string, CourseProgress> = {};

        for (const enrollment of data) {
          const sections = await fetchCourseSections(enrollment.course_id);
          const lessons = sections.flatMap((section) => section.lessons ?? []);
          const progress = await fetchLessonProgress(
            session.user.id,
            lessons.map((lesson) => lesson.id)
          );
          const completedLessons = progress.filter((item) => item.completed).length;

          progressMap[enrollment.course_id] = {
            completedLessons,
            totalLessons: lessons.length,
            percentage: computeCourseProgress(lessons.length, completedLessons),
          };
        }

        if (active) {
          setEnrollments(data);
          setCourseProgress(progressMap);
        }
      } catch (error) {
        console.error("[MyCoursesPage] load progress error:", error);
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  /* =========================================================
     Check for a new course matching the student's college
     (or a course available to "all" colleges)
  ========================================================= */
  useEffect(() => {
    if (!session?.user) return;

    let active = true;

    (async () => {
      try {
        // 1) هات كلية الطالب
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("college")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profile?.college) return;

        // 2) هات آخر كورس منشور يخص كليته أو "all"
        const { data: latestCourse, error: courseError } = await supabase
          .from("courses")
          .select("id, title, slug, college")
          .eq("is_published", true)
          .or(`college.eq.${profile.college},college.eq.all`)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (courseError) throw courseError;
        if (!latestCourse) return;

        // 3) قارن مع آخر كورس شافه الطالب (محفوظ في localStorage)
        const lastSeenId = localStorage.getItem(
          NEW_COURSE_SEEN_KEY + "_" + session.user.id
        );

        if (active && latestCourse.id !== lastSeenId) {
          setNewCourseAlert(latestCourse as NewCourseAlert);
        }
      } catch (err) {
        console.error("[MyCoursesPage] new course alert error:", err);
      }
    })();

    return () => {
      active = false;
    };
  }, [session?.user?.id]);

  function dismissNewCourseAlert() {
    if (session?.user && newCourseAlert) {
      localStorage.setItem(
        NEW_COURSE_SEEN_KEY + "_" + session.user.id,
        newCourseAlert.id
      );
    }
    setNewCourseAlert(null);
  }

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

      {/* New Course Alert Banner */}
      <AnimatePresence>
        {newCourseAlert && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden rounded-2xl border border-brand-100 bg-brand-50 p-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-500 text-white">
                  <Bell className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-black text-slate-900">
                    كورس جديد: {newCourseAlert.title}
                  </p>
                  <p className="text-xs text-slate-500">
                    {newCourseAlert.college === "all"
                      ? "متاح لجميع الكليات"
                      : "متاح لكليتك"}
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <Link
                  to="/courses"
                  onClick={dismissNewCourseAlert}
                  className="whitespace-nowrap rounded-full bg-brand-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-brand-700"
                >
                  شوف آخر الكورسات
                </Link>

                <button
                  onClick={dismissNewCourseAlert}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-white hover:text-slate-600"
                  aria-label="إغلاق"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
            const progress = courseProgress[enrollment.course_id] ?? {
              completedLessons: 0,
              totalLessons: 0,
              percentage: 0,
            };
            const thumb = getPublicUrl(
              "course-thumbnails",
              enrollment.course?.thumbnail_path ?? null
            );

            const isCompleted = progress.percentage >= 100;
            const isStarted = progress.completedLessons > 0 && !isCompleted;

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
                <Card className="group h-full overflow-hidden rounded-3xl border-slate-100 p-0 shadow-sm transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-2xl hover:shadow-brand-900/10">
                  {/* Image */}
                  <div className="relative h-48 overflow-hidden bg-gradient-to-br from-brand-500 via-brand-700 to-brand-900">
                    {thumb ? (
                      <img
                        src={thumb}
                        alt={enrollment.course?.title ?? "Course"}
                        className="h-full w-full object-cover transition duration-700 group-hover:scale-110"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <BookOpen className="h-14 w-14 text-white/30" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />

                    {/* Status badge (completed / in progress) */}
                    <div className="absolute right-4 top-4">
                      {isCompleted ? (
                        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/95 px-3 py-1.5 text-[10px] font-black text-white shadow-sm backdrop-blur">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          مكتمل
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-black text-brand-700 shadow-sm backdrop-blur">
                          <PlayCircle className="h-3.5 w-3.5" />
                          مسجل حاليًا
                        </div>
                      )}
                    </div>

                    {/* Circular progress badge */}
                    <div className="absolute left-4 top-4">
                      <div className="relative flex h-11 w-11 items-center justify-center">
                        <svg className="h-11 w-11 -rotate-90" viewBox="0 0 40 40">
                          <circle
                            cx="20"
                            cy="20"
                            r="16"
                            fill="none"
                            stroke="rgba(255,255,255,0.25)"
                            strokeWidth="4"
                          />
                          <circle
                            cx="20"
                            cy="20"
                            r="16"
                            fill="none"
                            stroke={isCompleted ? "#10b981" : "#ffffff"}
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${2 * Math.PI * 16}`}
                            strokeDashoffset={`${
                              2 * Math.PI * 16 * (1 - progress.percentage / 100)
                            }`}
                            className="transition-all duration-700"
                          />
                        </svg>
                        <span className="absolute text-[9px] font-black text-white">
                          {progress.percentage}%
                        </span>
                      </div>
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
                      <GraduationCap className="h-4 w-4 shrink-0" />
                      <span className="truncate">
                        {enrollment.course?.teacher?.full_name ?? "المعلم"}
                      </span>
                    </div>

                    {/* Stats row */}
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        <BookOpen className="h-3.5 w-3.5 text-brand-500" />
                        <span className="text-[11px] font-bold text-slate-600">
                          {progress.completedLessons}/{progress.totalLessons} درس
                        </span>
                      </div>

                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        {isCompleted ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                            <span className="text-[11px] font-bold text-emerald-600">
                              تم الإنجاز
                            </span>
                          </>
                        ) : isStarted ? (
                          <>
                            <Flame className="h-3.5 w-3.5 text-orange-500" />
                            <span className="text-[11px] font-bold text-slate-600">
                              مستمر
                            </span>
                          </>
                        ) : (
                          <>
                            <Clock className="h-3.5 w-3.5 text-slate-400" />
                            <span className="text-[11px] font-bold text-slate-500">
                              لم يبدأ بعد
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="mt-4">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-500">تقدمك</span>
                        <span
                          className={`font-black ${
                            isCompleted ? "text-emerald-600" : "text-brand-600"
                          }`}
                        >
                          {progress.percentage}%
                        </span>
                      </div>

                      <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${progress.percentage}%` }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                          className={`h-full rounded-full ${
                            isCompleted
                              ? "bg-gradient-to-r from-emerald-400 to-emerald-600"
                              : "bg-gradient-to-r from-brand-400 to-brand-600"
                          }`}
                        />
                      </div>
                    </div>

                    <Link
                      to={`/app/student/courses/${enrollment.course_id}/learn`}
                    >
                      <Button
                        className={`mt-5 w-full ${
                          isCompleted
                            ? "bg-emerald-600 hover:bg-emerald-700"
                            : ""
                        }`}
                      >
                        <PlayCircle className="h-4 w-4" />
                        {isCompleted ? "مراجعة الكورس" : "متابعة التعلّم"}
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

      {/* Browse more courses button */}
      {!loading && (
        <div className="flex justify-center pt-4">
          <Link to="/courses" className="group">
            <div className="flex items-center gap-2.5 rounded-full border-2 border-brand-100 bg-white px-6 py-3.5 font-bold text-brand-700 shadow-sm transition-all duration-300 hover:border-brand-500 hover:bg-brand-500 hover:text-white hover:shadow-lg hover:shadow-brand-500/20">
              <Compass className="h-5 w-5 transition-transform duration-500 group-hover:rotate-180" />
              <span>تصفّح المزيد من الكورسات</span>
              <ArrowLeft className="h-4 w-4 transition-transform duration-300 group-hover:-translate-x-1" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}