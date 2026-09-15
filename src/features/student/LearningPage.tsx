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
  BookOpen,
  PanelRightClose,
  PanelRightOpen,
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

import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import { VideoWatermark } from "@/components/video/VideoWatermark";
import { useScreenRecordingGuard } from "@/hooks/useScreenRecordingGuard";

import type {
  Course,
  CourseSection,
  Lesson,
  LessonProgress,
  Quiz,
} from "@/types";

import { formatDuration } from "@/utils/format";

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

  const [
    progressMap,
    setProgressMap,
  ] = useState<
    Record<string, LessonProgress>
  >({});

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
    desktopSidebarOpen,
    setDesktopSidebarOpen,
  ] = useState(true);

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

  const [
    recordingBlocked,
    setRecordingBlocked,
  ] = useState(false);

  const videoContainerRef =
    useRef<HTMLDivElement>(null);

  const videoElementRef =
    useRef<HTMLVideoElement>(null);

  /*
   * جميع الدروس
   */

  const allLessons = useMemo(
    () =>
      sections.flatMap(
        (section) =>
          section.lessons ?? []
      ),
    [sections]
  );

  /*
   * Online / Offline
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
   * منع Scroll الصفحة خلف Drawer
   */

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  /*
   * تحميل الكورس
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

        const map: Record<
          string,
          LessonProgress
        > = {};

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
   * تحميل الفيديو
   */

  const loadVideo = useCallback(
    async (lesson: Lesson) => {
      setVideoUrl(null);
      setVideoError(null);
      setOfflineAvailable(false);
      setRecordingBlocked(false);

      try {
        const offlineUrl =
          await getOfflineVideoSource(
            lesson.id
          );

        if (offlineUrl) {
          setOfflineAvailable(true);
          setVideoUrl(offlineUrl);
          return;
        }

        if (!navigator.onLine) {
          setVideoError(
            "هذا الفيديو غير محفوظ للمشاهدة بدون إنترنت."
          );

          return;
        }

        const signedUrl =
          await getSignedLessonVideoUrl(
            lesson.id
          );

        setVideoUrl(signedUrl);
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

    loadVideo(activeLesson);
  }, [
    activeLesson?.id,
    loadVideo,
  ]);

  /*
   * Offline availability
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
          setOfflineAvailable(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [
    activeLesson?.id,
  ]);

  /*
   * حماية المحتوى
   */

  const handleSuspiciousActivity =
    useCallback(() => {
      const video =
        videoElementRef.current;

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
    onSuspiciousActivity:
      handleSuspiciousActivity,
  });

  const handleRetryAfterBlock =
    () => {
      setRecordingBlocked(false);

      if (activeLesson) {
        loadVideo(activeLesson);
      }
    };

  /*
   * تحميل Offline
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

        setOfflineAvailable(true);

        const localUrl =
          await getOfflineVideoSource(
            activeLesson.id
          );

        if (localUrl) {
          setVideoUrl(localUrl);
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
   * حذف Offline
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

        setOfflineAvailable(false);

        if (navigator.onLine) {
          const signedUrl =
            await getSignedLessonVideoUrl(
              activeLesson.id
            );

          setVideoUrl(signedUrl);
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
      setActiveLesson(next);

      /*
       * إغلاق Sidebar على الهاتف
       */
      setSidebarOpen(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  const goToPrev = () => {
    const previous =
      allLessons[
        currentIndex - 1
      ];

    if (previous) {
      setActiveLesson(previous);

      setSidebarOpen(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    }
  };

  /*
   * إكمال الدرس
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
   * Watermark
   */

  const watermarkPhone =
    (session?.user?.user_metadata
      ?.phone as string | undefined) ??
    (session?.user as any)?.phone ??
    "";

  /*
   * Sidebar content
   */

  const SidebarContent = () => (
    <>
      <div className="border-b border-slate-100 bg-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
              <ListVideo className="h-4 w-4" />
            </div>

            <div>
              <p className="text-sm font-bold text-slate-800">
                محتوى الكورس
              </p>

              <p className="text-[11px] text-slate-400">
                {completedCount} من{" "}
                {allLessons.length} درس
              </p>
            </div>
          </div>

          <span className="text-sm font-bold text-brand-500">
            {courseProgress}%
          </span>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-l from-brand-500 to-brand-900"
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

      <div className="p-3">
        {sections.map(
          (section) => (
            <div
              key={section.id}
              className="mb-5 last:mb-0"
            >
              <div className="mb-2 flex items-center gap-2 px-2">
                <div className="h-1 w-1 rounded-full bg-brand-500" />

                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {section.title}
                </p>
              </div>

              <div className="space-y-1">
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
                        className={`
                          group
                          flex
                          w-full
                          items-center
                          gap-2.5
                          rounded-xl
                          px-3
                          py-3
                          text-sm
                          text-right
                          transition-all
                          duration-200
                          ${
                            isActive
                              ? "bg-brand-50 text-brand-900 shadow-sm ring-1 ring-brand-100"
                              : "text-slate-600 hover:bg-slate-50"
                          }
                        `}
                      >
                        <div
                          className={`
                            flex
                            h-7
                            w-7
                            shrink-0
                            items-center
                            justify-center
                            rounded-lg
                            ${
                              done
                                ? "bg-emerald-50"
                                : isActive
                                  ? "bg-white"
                                  : "bg-slate-50"
                            }
                          `}
                        >
                          {done ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ) : (
                            <Circle
                              className={`
                                h-4 w-4
                                ${
                                  isActive
                                    ? "text-brand-500"
                                    : "text-slate-300"
                                }
                              `}
                            />
                          )}
                        </div>

                        <span className="min-w-0 flex-1 truncate font-medium">
                          {lesson.title}
                        </span>

                        <div className="flex shrink-0 items-center gap-1.5">
                          {lesson.id ===
                            activeLesson?.id &&
                            offlineAvailable && (
                              <HardDriveDownload className="h-3.5 w-3.5 text-emerald-500" />
                            )}

                          <span className="text-[10px] text-slate-400">
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
            </div>
          )
        )}
      </div>
    </>
  );

  /*
   * Loading
   */

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6 sm:py-10">
        <Skeleton className="aspect-video w-full rounded-2xl" />
      </div>
    );
  }

  if (!course) {
    return null;
  }

  return (
    <div
      dir="rtl"
      className="flex h-[100dvh] flex-col overflow-hidden bg-slate-50"
    >
      {/* ================================================================ */}
      {/* HEADER                                                           */}
      {/* ================================================================ */}

      <header className="z-40 flex h-14 shrink-0 items-center justify-between border-b border-slate-100 bg-white/95 px-3 shadow-sm backdrop-blur sm:px-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <Link
            to="/app/student/courses"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-50 hover:text-brand-500"
          >
            <ChevronRight className="h-5 w-5" />
          </Link>

          <div className="min-w-0">
            <p className="truncate text-sm font-bold leading-tight text-slate-800 sm:text-base">
              {course.title}
            </p>

            <p className="mt-0.5 text-[10px] text-slate-400 sm:text-[11px]">
              {completedCount} /{" "}
              {allLessons.length} درس مكتمل
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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
            type="button"
            aria-label={
              desktopSidebarOpen
                ? "إغلاق الشريط الجانبي"
                : "فتح الشريط الجانبي"
            }
            title={
              desktopSidebarOpen
                ? "إغلاق الشريط الجانبي"
                : "فتح الشريط الجانبي"
            }
            onClick={() =>
              setDesktopSidebarOpen((open) => !open)
            }
            className="hidden h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition hover:bg-brand-50 hover:text-brand-600 lg:flex"
          >
            {desktopSidebarOpen ? (
              <PanelRightClose className="h-4 w-4" />
            ) : (
              <PanelRightOpen className="h-4 w-4" />
            )}
          </button>

          <button
            type="button"
            aria-label="فتح محتوى الكورس"
            onClick={() =>
              setSidebarOpen(true)
            }
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-600 transition hover:bg-brand-50 hover:text-brand-600 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* ================================================================ */}
      {/* MAIN                                                             */}
      {/* ================================================================ */}

      <div className="relative flex min-h-0 flex-1">
        {/* ============================================================ */}
        {/* CONTENT                                                       */}
        {/* ============================================================ */}

        <main className="min-w-0 flex-1 overflow-y-auto">
          {/* VIDEO */}

          <div className="bg-black">
            <div
              ref={videoContainerRef}
              className="relative mx-auto aspect-video w-full max-w-5xl overflow-hidden"
            >
              {recordingBlocked ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/80">
                  <ShieldAlert className="h-10 w-10 text-red-400" />

                  <p className="text-sm font-bold text-red-300">
                    تم إيقاف تشغيل الفيديو لحماية حقوق المحتوى
                  </p>

                  <p className="max-w-xs text-xs leading-5 text-white/50">
                    تم رصد نشاط قد يشير إلى محاولة تسجيل الشاشة.
                  </p>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={
                      handleRetryAfterBlock
                    }
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
                    className="h-full w-full object-contain"
                    onContextMenu={(event) =>
                      event.preventDefault()
                    }
                  />

                  {watermarkPhone && (
                    <VideoWatermark
                      phone={watermarkPhone}
                      containerRef={
                        videoContainerRef
                      }
                    />
                  )}

                  {offlineAvailable && (
                    <div className="absolute right-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-emerald-500/90 px-2.5 py-1.5 text-[10px] font-bold text-white shadow-lg backdrop-blur sm:right-4 sm:top-4 sm:px-3 sm:text-xs">
                      <HardDriveDownload className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                      بدون إنترنت
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full flex-col items-center justify-center gap-3 p-6 text-center text-white/70">
                  {!isOnline ? (
                    <WifiOff className="h-9 w-9 text-white/30" />
                  ) : (
                    <Wifi className="h-9 w-9 text-white/30" />
                  )}

                  <p className="max-w-sm text-xs leading-5 sm:text-sm">
                    {videoError ??
                      "جاري تحميل الفيديو..."}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* LESSON */}

          <div className="mx-auto max-w-5xl p-4 sm:p-6 lg:p-8">
            <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <div className="mb-2 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-brand-500" />

                    <span className="text-xs font-semibold text-brand-600">
                      الدرس الحالي
                    </span>
                  </div>

                  <h2 className="text-lg font-bold leading-8 text-slate-800 sm:text-xl">
                    {activeLesson?.title}
                  </h2>

                  {activeLesson?.description && (
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      {activeLesson.description}
                    </p>
                  )}
                </div>

                {isActiveDone && (
                  <span className="flex w-fit shrink-0 items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-600">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    مكتمل
                  </span>
                )}
              </div>

              {/* NAVIGATION */}

              <div className="mt-5 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                <Button
                  variant="outline"
                  onClick={goToPrev}
                  disabled={
                    currentIndex <= 0
                  }
                  className="w-full sm:w-auto"
                >
                  <ChevronRight className="h-4 w-4" />
                  السابق
                </Button>

                <Button
                  variant="outline"
                  onClick={goToNext}
                  disabled={
                    currentIndex >=
                    allLessons.length - 1
                  }
                  className="w-full sm:w-auto"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <Button
                  onClick={markComplete}
                  disabled={isActiveDone}
                  className="col-span-2 w-full sm:w-auto"
                >
                  <CheckCircle2 className="h-4 w-4" />

                  {isActiveDone
                    ? "تم الإكمال"
                    : "تحديد كمكتمل"}
                </Button>
              </div>
            </div>

            {/* OFFLINE */}

            <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:mt-6 sm:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div
                    className={`
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      ${
                        offlineAvailable
                          ? "bg-emerald-50 text-emerald-600"
                          : "bg-brand-50 text-brand-600"
                      }
                    `}
                  >
                    {offlineAvailable ? (
                      <HardDriveDownload className="h-5 w-5" />
                    ) : (
                      <Download className="h-5 w-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-800">
                      المشاهدة بدون إنترنت
                    </p>

                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      {offlineAvailable
                        ? "الفيديو محفوظ على جهازك ويمكن تشغيله بدون إنترنت."
                        : "احفظ الفيديو لمشاهدته لاحقًا بدون إنترنت."}
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
                    className="w-full border-red-200 text-red-600 hover:bg-red-50 sm:w-auto"
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
                    className="w-full sm:min-w-[180px] sm:w-auto"
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
                <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs font-medium leading-5 text-amber-700">
                  <WifiOff className="mt-0.5 h-4 w-4 shrink-0" />

                  <span>
                    {offlineAvailable
                      ? "أنت غير متصل بالإنترنت، ويمكنك تشغيل هذا الفيديو لأنه محفوظ Offline."
                      : "أنت غير متصل بالإنترنت، احفظ الفيديو أولًا أثناء الاتصال بالإنترنت."}
                  </span>
                </div>
              )}
            </div>

            {/* QUIZZES */}

            {quizzes.length > 0 && (
              <div className="mt-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 to-white p-4 sm:mt-6 sm:p-5">
                <h3 className="flex items-center gap-2 font-bold text-brand-900">
                  <ClipboardList className="h-5 w-5" />

                  اختبارات هذا الكورس
                </h3>

                <div className="mt-3 space-y-2">
                  {quizzes.map(
                    (quiz) => (
                      <Link
                        key={quiz.id}
                        to={`/app/student/quizzes/${quiz.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-sm shadow-sm transition hover:shadow-md"
                      >
                        <span className="min-w-0 truncate font-semibold text-slate-700">
                          {quiz.title}
                        </span>

                        <span className="shrink-0 text-xs text-slate-400">
                          {quiz.duration_minutes}{" "}
                          دقيقة
                        </span>
                      </Link>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="h-6 sm:h-10" />
          </div>
        </main>

        {/* ============================================================ */}
        {/* DESKTOP SIDEBAR                                             */}
        {/* ============================================================ */}

        <aside
          className={`hidden shrink-0 overflow-y-auto border-l border-slate-100 bg-white shadow-[-6px_0_18px_rgba(15,23,42,0.03)] transition-[width] duration-300 lg:block ${
            desktopSidebarOpen
              ? "w-80"
              : "w-0 border-l-0 shadow-none"
          }`}
        >
          <div
            className={`h-full w-80 transition-opacity duration-200 ${
              desktopSidebarOpen
                ? "opacity-100"
                : "pointer-events-none opacity-0"
            }`}
          >
            <SidebarContent />
          </div>
        </aside>
      </div>

      {/* ================================================================ */}
      {/* MOBILE DRAWER                                                    */}
      {/* ================================================================ */}

      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Overlay */}

            <motion.button
              type="button"
              aria-label="إغلاق القائمة"
              className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-[2px] lg:hidden"
              initial={{
                opacity: 0,
              }}
              animate={{
                opacity: 1,
              }}
              exit={{
                opacity: 0,
              }}
              transition={{
                duration: 0.2,
              }}
              onClick={() =>
                setSidebarOpen(false)
              }
            />

            {/* Drawer */}

            <motion.aside
              initial={{
                x: "100%",
              }}
              animate={{
                x: 0,
              }}
              exit={{
                x: "100%",
              }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 38,
              }}
              className="fixed inset-y-0 right-0 z-[60] flex w-[88%] max-w-[380px] flex-col overflow-hidden bg-white shadow-2xl lg:hidden"
            >
              {/* Drawer Header */}

              <div className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 bg-white px-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                    <ListVideo className="h-4 w-4" />
                  </div>

                  <div>
                    <p className="text-sm font-bold text-slate-800">
                      محتوى الكورس
                    </p>

                    <p className="text-[10px] text-slate-400">
                      {completedCount} /{" "}
                      {allLessons.length} مكتمل
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label="إغلاق القائمة"
                  onClick={() =>
                    setSidebarOpen(false)
                  }
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-50 text-slate-500 transition hover:bg-red-50 hover:text-red-500"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Mobile progress */}

              <div className="shrink-0 border-b border-slate-100 bg-slate-50/70 px-4 py-3">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-slate-500">
                    تقدمك في الكورس
                  </span>

                  <span className="font-bold text-brand-600">
                    {courseProgress}%
                  </span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-l from-brand-500 to-brand-900"
                    initial={{
                      width: 0,
                    }}
                    animate={{
                      width: `${courseProgress}%`,
                    }}
                  />
                </div>
              </div>

              {/* Lessons */}

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-6">
                <SidebarContent />
              </div>

              {/* Bottom safe area */}

              <div className="h-[env(safe-area-inset-bottom)] shrink-0 bg-white" />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

