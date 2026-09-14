import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  CheckCircle2, Circle, ChevronRight, ChevronLeft, PlayCircle, Lock, Menu, X, ClipboardList,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { fetchCourseBySlugOrId } from "@/services/coursesById";
import { fetchCourseSections } from "@/services/courses";
import { fetchLessonProgress, upsertLessonProgress, computeCourseProgress } from "@/services/enrollments";
import { fetchCourseQuizzes } from "@/services/quizzes";
import { getSignedLessonVideoUrl } from "@/services/video";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";
import type { Course, CourseSection, Lesson, LessonProgress, Quiz } from "@/types";
import { formatDuration } from "@/utils/format";

export default function LearningPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { session } = useAuth();
  const { showToast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [videoError, setVideoError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const allLessons = useMemo(() => sections.flatMap((s) => s.lessons ?? []), [sections]);

  useEffect(() => {
    if (!courseId || !session?.user) return;
    let active = true;
    setLoading(true);
    (async () => {
      try {
        const c = await fetchCourseBySlugOrId(courseId);
        if (!active) return;
        setCourse(c);
        const sec = await fetchCourseSections(c.id);
        const lessons = sec.flatMap((s) => s.lessons ?? []);
        const [progress, quizList] = await Promise.all([
          fetchLessonProgress(session.user.id, lessons.map((l) => l.id)),
          fetchCourseQuizzes(c.id),
        ]);
        if (!active) return;
        setSections(sec);
        setQuizzes(quizList);
        const map: Record<string, LessonProgress> = {};
        progress.forEach((p) => (map[p.lesson_id] = p));
        setProgressMap(map);
        setActiveLesson(lessons[0] ?? null);
      } catch {
        showToast("تعذّر تحميل الكورس", "error");
      } finally {
        active && setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, session?.user?.id]);

  useEffect(() => {
    if (!activeLesson) return;
    setVideoUrl(null);
    setVideoError(null);
    getSignedLessonVideoUrl(activeLesson.id)
      .then(setVideoUrl)
      .catch(() => setVideoError("لم يتم رفع فيديو لهذا الدرس بعد، أو لا تملك صلاحية الوصول إليه."));
  }, [activeLesson?.id]);

  const markComplete = async () => {
    if (!activeLesson || !session?.user) return;
    try {
      await upsertLessonProgress({
        studentId: session.user.id,
        lessonId: activeLesson.id,
        progressSeconds: activeLesson.duration_seconds,
        completed: true,
      });
      setProgressMap((prev) => ({
        ...prev,
        [activeLesson.id]: { ...prev[activeLesson.id], lesson_id: activeLesson.id, completed: true } as LessonProgress,
      }));
      showToast("أحسنت! تم تسجيل إتمام الدرس", "success");
      goToNext();
    } catch {
      showToast("تعذّر تحديث تقدّمك", "error");
    }
  };

  const currentIndex = allLessons.findIndex((l) => l.id === activeLesson?.id);
  const goToNext = () => {
    const next = allLessons[currentIndex + 1];
    if (next) setActiveLesson(next);
  };
  const goToPrev = () => {
    const prev = allLessons[currentIndex - 1];
    if (prev) setActiveLesson(prev);
  };

  const completedCount = allLessons.filter((l) => progressMap[l.id]?.completed).length;
  const courseProgress = computeCourseProgress(allLessons.length, completedCount);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-4">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex h-14 items-center justify-between border-b border-slate-100 bg-white px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/app/student/courses" className="text-slate-400 hover:text-brand-500"><ChevronRight className="w-5 h-5" /></Link>
          <p className="truncate font-bold text-slate-800">{course.title}</p>
        </div>
        <button className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
          {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          <div className="bg-black">
            <div className="mx-auto aspect-video max-w-5xl">
              {videoUrl ? (
                <video key={videoUrl} src={videoUrl} controls className="h-full w-full" />
              ) : (
                <div className="flex h-full items-center justify-center text-white/70 text-sm text-center p-6">
                  {videoError ?? "جاري تحميل الفيديو..."}
                </div>
              )}
            </div>
          </div>

          <div className="mx-auto max-w-5xl p-6">
            <h2 className="text-xl font-bold text-slate-800">{activeLesson?.title}</h2>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">{activeLesson?.description}</p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="outline" onClick={goToPrev} disabled={currentIndex <= 0}>
                <ChevronRight className="w-4 h-4" /> الدرس السابق
              </Button>
              <Button variant="outline" onClick={goToNext} disabled={currentIndex >= allLessons.length - 1}>
                الدرس التالي <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button onClick={markComplete}>
                <CheckCircle2 className="w-4 h-4" /> تحديد كمكتمل
              </Button>
            </div>

            {quizzes.length > 0 && (
              <div className="mt-8 rounded-2xl border border-brand-100 bg-brand-50/60 p-5">
                <h3 className="flex items-center gap-2 font-bold text-brand-900">
                  <ClipboardList className="w-5 h-5" /> اختبارات هذا الكورس
                </h3>
                <div className="mt-3 space-y-2">
                  {quizzes.map((q) => (
                    <Link key={q.id} to={`/app/student/quizzes/${q.id}`} className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm hover:shadow-sm">
                      <span className="font-semibold text-slate-700">{q.title}</span>
                      <span className="text-xs text-slate-400">{q.duration_minutes} دقيقة</span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className={`w-80 shrink-0 border-r border-slate-100 bg-white overflow-y-auto lg:block ${sidebarOpen ? "block absolute inset-y-14 left-0 z-30 shadow-xl" : "hidden"}`}>
          <div className="p-4 border-b border-slate-100">
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold text-slate-700">تقدّمك في الكورس</span>
              <span className="font-bold text-brand-500">{courseProgress}%</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
              <motion.div
                className="h-2 rounded-full bg-brand-500"
                initial={{ width: 0 }}
                animate={{ width: `${courseProgress}%` }}
                transition={{ duration: 0.6 }}
              />
            </div>
          </div>
          {sections.map((section) => (
            <div key={section.id} className="border-b border-slate-50 p-3">
              <p className="px-2 py-1 text-xs font-bold text-slate-400">{section.title}</p>
              {section.lessons?.map((lesson) => {
                const done = progressMap[lesson.id]?.completed;
                const isActive = lesson.id === activeLesson?.id;
                return (
                  <button
                    key={lesson.id}
                    onClick={() => {
                      setActiveLesson(lesson);
                      setSidebarOpen(false);
                    }}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                      isActive ? "bg-brand-50 text-brand-900 font-semibold" : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {done ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" /> : <Circle className="w-4 h-4 shrink-0 text-slate-300" />}
                    <span className="flex-1 truncate text-right">{lesson.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDuration(lesson.duration_seconds)}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </aside>
      </div>
    </div>
  );
}
