import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  useParams,
  Link,
} from "react-router-dom";

import {
  motion,
  AnimatePresence,
} from "framer-motion";

import {
  CheckCircle2,
  Circle,
  ChevronRight,
  ChevronLeft,
  Menu,
  X,
  ClipboardList,
  ListVideo,
  Download,
  Trash2,
  Wifi,
  WifiOff,
  HardDriveDownload,
  Loader2,
  ShieldAlert,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";

import {
  fetchCourseBySlugOrId,
} from "@/services/coursesById";

import {
  fetchCourseSections,
} from "@/services/courses";

import {
  fetchLessonProgress,
  upsertLessonProgress,
  computeCourseProgress,
} from "@/services/enrollments";

import {
  fetchCourseQuizzes,
} from "@/services/quizzes";

import {
  getSignedLessonVideoUrl,
} from "@/services/video";

import {
  downloadLessonForOffline,
  getOfflineVideoSource,
  isLessonAvailableOffline,
  removeLessonOffline,
} from "@/services/offlineVideo";

import {
  useAuth,
} from "@/contexts/AuthContext";

import {
  useToast,
} from "@/contexts/ToastContext";

import { VideoWatermark } from "@/components/video/VideoWatermark";
import { useScreenRecordingGuard } from "@/hooks/useScreenRecordingGuard";

import type {
  Course,
  CourseSection,
  Lesson,
  LessonProgress,
  Quiz,
} from "@/types";

import {
  formatDuration,
} from "@/utils/format";

export default function LearningPage() {
  const {
    courseId,
  } = useParams<{
    courseId: string;
  }>();

  const {
    session,
  } = useAuth();

  const {
    showToast,
  } = useToast();

  const [
    course,
    setCourse,
  ] = useState<Course | null>(null);

  const [
    sections,
    setSections,
  ] = useState<CourseSection[]>([]);

const [progressMap, setProgressMap] = useState<Record<string, LessonProgress>>({});

  const [
    quizzes,
    setQuizzes,
  ] = useState<Quiz[]>([]);

  const [
    activeLesson,
    setActiveLesson,
  ] = useState<Lesson | null>(null);

  const [
    videoUrl,
    setVideoUrl,
  ] = useState<string | null>(null);

  const [
    videoError,
    setVideoError,
  ] = useState<string | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    sidebarOpen,
    setSidebarOpen,
  ] = useState(false);

  const [
    isOnline,
    setIsOnline,
  ] = useState(
    typeof navigator !== "undefined"
      ? navigator.onLine
      : true
  );

  const [
    offlineAvailable,
    setOfflineAvailable,
  ] = useState(false);

  const [
    downloading,
    setDownloading,
  ] = useState(false);

  const [
    downloadProgress,
    setDownloadProgress,
  ] = useState(0);

  const [
    removingOffline,
    setRemovingOffline,
  ] = useState(false);

  /*
   * حماية المحتوى: كشف تسجيل الشاشة
   */

  const [
    recordingBlocked,
    setRecordingBlocked,
  ] = useState(false);

  const videoContainerRef =
    useRef<HTMLDivElement>(null);

  const videoElementRef =
    useRef<HTMLVideoElement>(null);

  const allLessons = useMemo(
    () =>
      sections.flatMap(
        (section) =>
          section.lessons ?? []
      ),
    [sections]
  );

  /*
   * Online / Offline detection
   */

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener(
      "online",
      handleOnline
    );

    window.addEventListener(
      "offline",
      handleOffline
    );

    return () => {
      window.removeEventListener(
        "online",
        handleOnline
      );

      window.removeEventListener(
        "offline",
        handleOffline
      );
    };
  }, []);

  /*
   * Load course
   */

  useEffect(() => {
    if (
      !courseId ||
      !session?.user
    ) {
      return;
    }

    let active = true;

    setLoading(true);

    (async () => {
      try {
        const currentCourse =
          await fetchCourseBySlugOrId(
            courseId
          );

        if (!active) {
          return;
        }

        setCourse(currentCourse);

        const currentSections =
          await fetchCourseSections(
            currentCourse.id
          );

        const lessons =
          currentSections.flatMap(
            (section) =>
              section.lessons ?? []
          );

        const [
          progress,
          quizList,
        ] = await Promise.all([
          fetchLessonProgress(
            session.user.id,
            lessons.map(
              (lesson) => lesson.id
            )
          ),

          fetchCourseQuizzes(
            currentCourse.id
          ),
        ]);

        if (!active) {
          return;
        }

        setSections(
          currentSections
        );

        setQuizzes(
          quizList
        );

const map: Record<string, LessonProgress> = {};

        progress.forEach(
          (item) => {
            map[item.lesson_id] =
              item;
          }
        );

        setProgressMap(map);

        setActiveLesson(
          lessons[0] ?? null
        );
      } catch {
        showToast(
          "تعذّر تحميل الكورس",
          "error"
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    courseId,
    session?.user?.id,
  ]);

  /*
   * Load video.
   *
   * Priority:
   *
   * 1. Offline cached video
   * 2. Online signed URL
   */

  const loadVideo = useCallback(
    async (lesson: Lesson) => {
      setVideoUrl(null);
      setVideoError(null);

      setOfflineAvailable(false);
      setRecordingBlocked(false);

      try {
        /*
         * Check local Offline copy first.
         */
        const offlineUrl =
          await getOfflineVideoSource(
            lesson.id
          );

        if (offlineUrl) {
          setOfflineAvailable(true);

          setVideoUrl(
            offlineUrl
          );

          return;
        }

        /*
         * No Offline copy.
         *
         * If user is offline, there is nothing
         * else we can do.
         */
        if (!navigator.onLine) {
          setVideoError(
            "هذا الفيديو غير محفوظ للمشاهدة بدون إنترنت."
          );

          return;
        }

        /*
         * Get fresh signed URL.
         */
        const signedUrl =
          await getSignedLessonVideoUrl(
            lesson.id
          );

        setVideoUrl(
          signedUrl
        );
      } catch {
        setVideoError(
          "لم يتم رفع فيديو لهذا الدرس بعد، أو لا تملك صلاحية الوصول إليه."
        );
      }
    },
    []
  );

  useEffect(() => {
    if (!activeLesson) {
      return;
    }

    loadVideo(
      activeLesson
    );
  }, [
    activeLesson?.id,
    loadVideo,
  ]);

  /*
   * Check Offline availability
   * when lesson changes.
   */

  useEffect(() => {
    if (!activeLesson) {
      return;
    }

    let mounted = true;

    isLessonAvailableOffline(
      activeLesson.id
    )
      .then((available) => {
        if (mounted) {
          setOfflineAvailable(
            available
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setOfflineAvailable(
            false
          );
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    activeLesson?.id,
  ]);

  /*
   * حماية المحتوى: عند اكتشاف نشاط تسجيل مشبوه
   * (طلب getDisplayMedia أو مغادرة التبويب أثناء التشغيل)
   * نوقف الفيديو فورًا.
   *
   * ملاحظة: هذا إجراء ردع إضافي، وليس ضمانًا مطلقًا،
   * حيث لا يمكن لأي تطبيق ويب منع تصوير الشاشة بجهاز آخر
   * أو أدوات تسجيل تعمل على مستوى نظام التشغيل.
   */

  const handleSuspiciousActivity = useCallback(() => {
    const video = videoElementRef.current;

    if (video) {
      video.pause();
    }

    setRecordingBlocked(true);
    setVideoUrl(null);

    showToast(
      "تم إيقاف الفيديو لحماية المحتوى من التسجيل غير المصرح به",
      "error"
    );
  }, [showToast]);

  useScreenRecordingGuard({
    onSuspiciousActivity: handleSuspiciousActivity,
  });

  const handleRetryAfterBlock = () => {
    setRecordingBlocked(false);

    if (activeLesson) {
      loadVideo(activeLesson);
    }
  };

  /*
   * Download video for Offline use
   */

  const handleDownloadOffline =
    async () => {
      if (
        !activeLesson ||
        !isOnline ||
        downloading
      ) {
        return;
      }

      try {
        setDownloading(true);
        setDownloadProgress(0);

        /*
         * Generate a fresh signed URL.
         */
        const signedUrl =
          await getSignedLessonVideoUrl(
            activeLesson.id
          );

        await downloadLessonForOffline(
          activeLesson.id,
          signedUrl,
          (progress) => {
            setDownloadProgress(
              progress
            );
          }
        );

        setOfflineAvailable(
          true
        );

        /*
         * Switch immediately to the
         * local Offline URL.
         */
        const localUrl =
          await getOfflineVideoSource(
            activeLesson.id
          );

        if (localUrl) {
          setVideoUrl(
            localUrl
          );
        }

        showToast(
          "تم حفظ الفيديو للمشاهدة بدون إنترنت",
          "success"
        );
      } catch (error) {
        console.error(
          "[MedCore] Offline download failed:",
          error
        );

        showToast(
          "تعذّر حفظ الفيديو على الجهاز",
          "error"
        );
      } finally {
        setDownloading(false);
      }
    };

  /*
   * Remove Offline video
   */

  const handleRemoveOffline =
    async () => {
      if (
        !activeLesson ||
        removingOffline
      ) {
        return;
      }

      try {
        setRemovingOffline(true);

        await removeLessonOffline(
          activeLesson.id
        );

        setOfflineAvailable(
          false
        );

        /*
         * Reload online signed URL
         * if Internet exists.
         */
        if (navigator.onLine) {
          const signedUrl =
            await getSignedLessonVideoUrl(
              activeLesson.id
            );

          setVideoUrl(
            signedUrl
          );
        } else {
          setVideoUrl(null);

          setVideoError(
            "تم حذف الفيديو المحفوظ، ولا يوجد اتصال بالإنترنت."
          );
        }

        showToast(
          "تم حذف الفيديو من التخزين Offline",
          "success"
        );
      } catch {
        showToast(
          "تعذّر حذف الفيديو",
          "error"
        );
      } finally {
        setRemovingOffline(false);
      }
    };

  /*
   * Mark lesson complete
   */

  const markComplete =
    async () => {
      if (
        !activeLesson ||
        !session?.user
      ) {
        return;
      }

      try {
        await upsertLessonProgress({
          studentId:
            session.user.id,

          lessonId:
            activeLesson.id,

          progressSeconds:
            activeLesson.duration_seconds,

          completed: true,
        });

        setProgressMap(
          (prev) => ({
            ...prev,

            [activeLesson.id]: {
              ...prev[
                activeLesson.id
              ],

              lesson_id:
                activeLesson.id,

              completed: true,
            } as LessonProgress,
          })
        );

        showToast(
          "أحسنت! تم تسجيل إتمام الدرس",
          "success"
        );

        goToNext();
      } catch {
        showToast(
          "تعذّر تحديث تقدّمك",
          "error"
        );
      }
    };

  /*
   * Navigation
   */

  const currentIndex =
    allLessons.findIndex(
      (lesson) =>
        lesson.id ===
        activeLesson?.id
    );

  const goToNext = () => {
    const next =
      allLessons[
        currentIndex + 1
      ];

    if (next) {
      setActiveLesson(
        next
      );
    }
  };

  const goToPrev = () => {
    const previous =
      allLessons[
        currentIndex - 1
      ];

    if (previous) {
      setActiveLesson(
        previous
      );
    }
  };

  /*
   * Progress
   */

  const isActiveDone =
    activeLesson
      ? !!progressMap[
          activeLesson.id
        ]?.completed
      : false;

  const completedCount =
    allLessons.filter(
      (lesson) =>
        progressMap[
          lesson.id
        ]?.completed
    ).length;

  const courseProgress =
    computeCourseProgress(
      allLessons.length,
      completedCount
    );

  /*
   * رقم الهاتف المستخدم في العلامة المائية.
   * يفترض وجود العمود phone في بيانات المستخدم؛
   * عدّل المسار حسب مكان تخزينه فعليًا في مشروعك.
   */

  const watermarkPhone =
    (session?.user?.user_metadata
      ?.phone as string | undefined) ??
    (session?.user as any)?.phone ??
    "";

  /*
   * Loading
   */

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-6 py-10 space-y-4">
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* ------------------------------------------------------------------ */}
      {/* Header                                                             */}
      {/* ------------------------------------------------------------------ */}

      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/app/student/courses"
            className="text-slate-400 hover:text-brand-500 transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>

          <div className="min-w-0">
            <p className="truncate font-bold text-slate-800 leading-tight">
              {course.title}
            </p>

            <p className="text-[11px] text-slate-400">
              {completedCount} /{" "}
              {allLessons.length}{" "}
              درس مكتمل
            </p>
          </div>
        </div>

        <div className="hidden items-center gap-2 sm:flex">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-500 transition-all"
              style={{
                width: `${courseProgress}%`,
              }}
            />
          </div>

          <span className="text-xs font-bold text-brand-500">
            {courseProgress}%
          </span>
        </div>

        <button
          className="lg:hidden text-slate-500"
          onClick={() =>
            setSidebarOpen(
              (value) => !value
            )
          }
        >
          {sidebarOpen ? (
            <X className="w-5 h-5" />
          ) : (
            <Menu className="w-5 h-5" />
          )}
        </button>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* Main                                                               */}
      {/* ------------------------------------------------------------------ */}

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 overflow-y-auto">
          {/* Video */}

          <div className="bg-black">
            <div
              ref={videoContainerRef}
              className="mx-auto aspect-video max-w-5xl relative overflow-hidden"
            >
              {recordingBlocked ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
                  <ShieldAlert className="h-10 w-10 text-red-400" />

                  <p className="text-sm font-bold text-red-300">
                    تم إيقاف تشغيل الفيديو لحماية حقوق المحتوى
                  </p>

                  <p className="max-w-xs text-xs text-white/50">
                    تم رصد نشاط قد يشير إلى محاولة تسجيل الشاشة.
                    إذا كنت تعتقد أن هذا خطأ، يمكنك إعادة المحاولة.
                  </p>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleRetryAfterBlock}
                  >
                    إعادة المحاولة
                  </Button>
                </div>
              ) : videoUrl ? (
                <>
                  <video
                    ref={videoElementRef}
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    controlsList="nodownload noremoteplayback"
                    disablePictureInPicture
                    playsInline
                    preload="metadata"
                    className="h-full w-full"
                    onContextMenu={(event) =>
                      event.preventDefault()
                    }
                  />

                  {/* العلامة المائية */}

                  {watermarkPhone && (
                    <VideoWatermark
                      phone={watermarkPhone}
                      containerRef={videoContainerRef}
                    />
                  )}

                  {/* Offline badge */}

                  {offlineAvailable && (
                    <div className="absolute right-4 top-4 z-10 flex items-center gap-2 rounded-full bg-emerald-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur">
                      <HardDriveDownload className="h-3.5 w-3.5" />
                      متاح بدون إنترنت
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/70">
                  {!isOnline ? (
                    <WifiOff className="h-10 w-10 text-white/40" />
                  ) : (
                    <Wifi className="h-10 w-10 text-white/40" />
                  )}

                  <p className="text-sm">
                    {videoError ??
                      "جاري تحميل الفيديو..."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Lesson information */}

          <div className="mx-auto max-w-5xl p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-bold text-slate-800">
                  {activeLesson?.title}
                </h2>

                <p className="mt-2 text-sm text-slate-500 leading-relaxed">
                  {activeLesson?.description}
                </p>
              </div>

              {isActiveDone && (
                <span className="flex shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  مكتمل
                </span>
              )}
            </div>

            {/* Navigation */}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={goToPrev}
                disabled={
                  currentIndex <= 0
                }
              >
                <ChevronRight className="w-4 h-4" />
                الدرس السابق
              </Button>

              <Button
                variant="outline"
                onClick={goToNext}
                disabled={
                  currentIndex >=
                  allLessons.length - 1
                }
              >
                الدرس التالي
                <ChevronLeft className="w-4 h-4" />
              </Button>

              <Button
                onClick={markComplete}
                disabled={isActiveDone}
              >
                <CheckCircle2 className="w-4 h-4" />

                {isActiveDone
                  ? "تم الإكمال"
                  : "تحديد كمكتمل"}
              </Button>
            </div>

            {/* ------------------------------------------------------------ */}
            {/* Offline controls                                              */}
            {/* ------------------------------------------------------------ */}

            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      offlineAvailable
                        ? "bg-emerald-50 text-emerald-600"
                        : "bg-brand-50 text-brand-600"
                    }`}
                  >
                    {offlineAvailable ? (
                      <HardDriveDownload className="h-5 w-5" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                  </div>

                  <div>
                    <p className="font-bold text-slate-800">
                      المشاهدة بدون إنترنت
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {offlineAvailable
                        ? "هذا الفيديو محفوظ على جهازك ويمكن تشغيله بدون إنترنت."
                        : "احفظ الفيديو داخل التطبيق لمشاهدته لاحقًا بدون إنترنت."}
                    </p>
                  </div>
                </div>

                {offlineAvailable ? (
                  <Button
                    variant="outline"
                    onClick={
                      handleRemoveOffline
                    }
                    disabled={
                      removingOffline
                    }
                    className="border-red-200 text-red-600 hover:bg-red-50"
                  >
                    {removingOffline ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}

                    {removingOffline
                      ? "جاري الحذف..."
                      : "حذف من الجهاز"}
                  </Button>
                ) : (
                  <Button
                    onClick={
                      handleDownloadOffline
                    }
                    disabled={
                      !isOnline ||
                      downloading
                    }
                    className="min-w-[180px]"
                  >
                    {downloading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        جاري الحفظ{" "}
                        {downloadProgress}%
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        حفظ بدون إنترنت
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Progress */}

              {downloading && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      جاري حفظ الفيديو...
                    </span>

                    <span className="font-bold text-brand-600">
                      {downloadProgress}%
                    </span>
                  </div>

                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <motion.div
                      className="h-full rounded-full bg-brand-500"
                      initial={{
                        width: 0,
                      }}
                      animate={{
                        width: `${downloadProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {!isOnline && (
                <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium text-amber-700">
                  <WifiOff className="h-4 w-4 shrink-0" />

                  {offlineAvailable
                    ? "أنت غير متصل بالإنترنت، ويمكنك تشغيل هذا الفيديو لأنه محفوظ Offline."
                    : "أنت غير متصل بالإنترنت، احفظ الفيديو أولًا أثناء الاتصال بالإنترنت."}
                </div>
              )}
            </div>

            {/* Quizzes */}

            {quizzes.length > 0 && (
              <div className="mt-8 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-5">
                <h3 className="flex items-center gap-2 font-bold text-brand-900">
                  <ClipboardList className="w-5 h-5" />

                  اختبارات هذا الكورس
                </h3>

                <div className="mt-3 space-y-2">
                  {quizzes.map(
                    (quiz) => (
                      <Link
                        key={quiz.id}
                        to={`/app/student/quizzes/${quiz.id}`}
                        className="flex items-center justify-between rounded-xl bg-white px-4 py-3 text-sm shadow-sm hover:shadow-md transition-shadow"
                      >
                        <span className="font-semibold text-slate-700">
                          {quiz.title}
                        </span>

                        <span className="text-xs text-slate-400">
                          {quiz.duration_minutes}{" "}
                          دقيقة
                        </span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar                                                           */}
        {/* ---------------------------------------------------------------- */}

        <AnimatePresence>
          {(sidebarOpen || true) && (
            <aside
              className={`w-80 shrink-0 border-r border-slate-100 bg-white overflow-y-auto lg:block ${
                sidebarOpen
                  ? "block absolute inset-y-14 left-0 z-30 shadow-xl"
                  : "hidden"
              }`}
            >
              <div className="sticky top-0 z-10 bg-white p-4 border-b border-slate-100">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <ListVideo className="w-4 h-4 text-brand-500" />

                  محتوى الكورس
                </div>

                <div className="mt-3 flex items-center justify-between text-sm">
                  <span className="text-slate-500">
                    تقدّمك في الكورس
                  </span>

                  <span className="font-bold text-brand-500">
                    {courseProgress}%
                  </span>
                </div>

                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <motion.div
                    className="h-2 rounded-full bg-gradient-to-l from-brand-500 to-brand-900"
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: `${courseProgress}%`,
                    }}
                    transition={{
                      duration: 0.6,
                    }}
                  />
                </div>
              </div>

              {sections.map(
                (section) => (
                  <div
                    key={section.id}
                    className="border-b border-slate-50 p-3"
                  >
                    <p className="px-2 py-1 text-xs font-bold text-slate-400">
                      {section.title}
                    </p>

                    {section.lessons?.map(
                      (lesson) => {
                        const done =
                          progressMap[
                            lesson.id
                          ]?.completed;

                        const isActive =
                          lesson.id ===
                          activeLesson?.id;

                        return (
                          <button
                            key={lesson.id}
                            onClick={() => {
                              setActiveLesson(
                                lesson
                              );

                              setSidebarOpen(
                                false
                              );
                            }}
                            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${
                              isActive
                                ? "bg-brand-50 text-brand-900 font-semibold ring-1 ring-brand-100"
                                : "text-slate-600 hover:bg-slate-50"
                            }`}
                          >
                            {done ? (
                              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
                            ) : (
                              <Circle className="w-4 h-4 shrink-0 text-slate-300" />
                            )}

                            <span className="flex-1 truncate text-right">
                              {lesson.title}
                            </span>

                            <div className="flex shrink-0 items-center gap-1.5">
                              {lesson.id ===
                                activeLesson?.id &&
                                offlineAvailable && (
                                  <HardDriveDownload className="h-3.5 w-3.5 text-emerald-500" />
                                )}

                              <span className="text-xs text-slate-400">
                                {formatDuration(
                                  lesson.duration_seconds
                                )}
                              </span>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )
              )}
            </aside>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}