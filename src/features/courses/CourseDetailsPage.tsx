import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import {
  Star,
  Users,
  Clock,
  PlayCircle,
  Lock,
  ShoppingCart,
  CheckCircle2,
  Stethoscope,
  ToothbrushSparkles,
  Pill,
  ChevronDown,
  ArrowRight,
  GraduationCap,
  ShieldCheck,
  BookOpen,
  Video,
  Play,
  Loader2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";

import {
  fetchCourseBySlug,
  fetchCourseSections,
  isStudentEnrolled,
} from "@/services/courses";

import { addToCart } from "@/services/cart";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/contexts/ToastContext";

import type {
  Course,
  CourseSection,
  Lesson,
} from "@/types";

import { COLLEGE_LABELS } from "@/types";

import { enrollFreeCourse } from "@/services/enrollments";

import {
  formatCurrency,
  formatDuration,
} from "@/utils/format";

import { getPublicUrl } from "@/lib/supabase";
import {
  getLessonPlaybackUrl,
  type VdoCipherPlaybackData,
} from "@/services/videoPlayback";

/* =========================================================
   College visual identity (icon + gradient)
   نفس الفكرة المستخدمة في FeaturedCoursesSection / CourseCard
========================================================= */

type CollegeMeta = {
  icon: typeof Stethoscope;
  gradient: string;
};

const COLLEGE_META: Record<string, CollegeMeta> = {
  medicine: {
    icon: Stethoscope,
    gradient: "from-brand-600 to-brand-900",
  },
  dentistry: {
    icon: ToothbrushSparkles,
    gradient: "from-violet-600 to-brand-800",
  },
  pharmacy: {
    icon: Pill,
    gradient: "from-emerald-600 to-teal-800",
  },
};

const DEFAULT_COLLEGE_META: CollegeMeta = {
  icon: Stethoscope,
  gradient: "from-brand-600 to-brand-900",
};

/**
 * بناء رابط تشغيل VdoCipher (iframe embed) من otp + playbackInfo.
 */
function buildVdoCipherEmbedUrl(
  playbackData: VdoCipherPlaybackData
): string {
  const params = new URLSearchParams({
    otp: playbackData.otp,
    playbackInfo: playbackData.playbackInfo,
  });

  return `https://player.vdocipher.com/v2/?${params.toString()}`;
}

export default function CourseDetailsPage() {
  const { slug } =
    useParams<{ slug: string }>();

  const { session, profile } =
    useAuth();

  const { showToast } =
    useToast();

  const navigate =
    useNavigate();

  /* ---------------------------------------------------------------------- */
  /* State                                                                   */
  /* ---------------------------------------------------------------------- */

  const [playingLesson, setPlayingLesson] = useState<Lesson | null>(null);
  const [previewPlaybackData, setPreviewPlaybackData] =
    useState<VdoCipherPlaybackData | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [course, setCourse] =
    useState<Course | null>(null);

  const [sections, setSections] =
    useState<CourseSection[]>([]);

  const [enrolled, setEnrolled] =
    useState(false);

  const [loading, setLoading] =
    useState(true);

  const [openSection, setOpenSection] =
    useState<string | null>(null);

  const [addingToCart, setAddingToCart] =
    useState(false);

  const [enrollingFree, setEnrollingFree] =
    useState(false);

  /* ---------------------------------------------------------------------- */
  /* Free enrollment                                                         */
  /* ---------------------------------------------------------------------- */

  const handleFreeEnroll = async () => {
    if (!session?.user || !course) {
      return;
    }

    setEnrollingFree(true);

    try {
      await enrollFreeCourse(
        session.user.id,
        course.id
      );

      showToast(
        "تم تسجيلك في الكورس بنجاح",
        "success"
      );

      navigate(
        `/app/student/courses/${course.id}/learn`
      );
    } catch (error) {
      console.error(
        "Free enroll error:",
        error
      );

      showToast(
        error instanceof Error
          ? error.message
          : "تعذّر التسجيل في الكورس",
        "error"
      );
    } finally {
      setEnrollingFree(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Load course                                                             */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!slug) return;

    let active = true;

    const loadCourse = async () => {
      setLoading(true);

      try {
        const currentCourse =
          await fetchCourseBySlug(slug);

        if (!active) return;

        setCourse(currentCourse);

        const currentSections =
          await fetchCourseSections(
            currentCourse.id
          );

        if (!active) return;

        setSections(
          currentSections
        );

        setOpenSection(
          currentSections[0]?.id ?? null
        );

        /*
         * التحقق من اشتراك الطالب.
         *
         * مهم:
         * enrolled هنا معناها أن الطالب لديه Enrollment
         * في الكورس.
         *
         * تفاصيل قفل أقسام التقسيط يتم التعامل معها
         * لاحقًا داخل LearningPage.
         */
        if (
          session?.user &&
          profile?.role === "student"
        ) {
          const studentEnrolled =
            await isStudentEnrolled(
              currentCourse.id,
              session.user.id
            );

          if (active) {
            setEnrolled(
              studentEnrolled
            );
          }
        } else {
          setEnrolled(false);
        }
      } catch (error) {
        console.error(
          "Load course details error:",
          error
        );

        if (active) {
          showToast(
            "تعذّر إيجاد هذا الكورس",
            "error"
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      active = false;
    };
  }, [
    slug,
    session?.user?.id,
    profile?.role,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Course stats                                                            */
  /* ---------------------------------------------------------------------- */

  const totalLessons =
    sections.reduce(
      (sum, section) =>
        sum +
        (section.lessons?.length ?? 0),
      0
    );

  const totalDuration =
    sections.reduce(
      (sum, section) =>
        sum +
        (section.lessons?.reduce(
          (lessonSum, lesson) =>
            lessonSum +
            lesson.duration_seconds,
          0
        ) ?? 0),
      0
    );

  /* ---------------------------------------------------------------------- */
  /* Add to cart                                                             */
  /* ---------------------------------------------------------------------- */

  const handleAddToCart =
    async () => {
      if (!session) {
        navigate("/auth/login", {
          state: {
            from: `/courses/${slug}`,
          },
        });

        return;
      }

      if (
        profile?.role !== "student"
      ) {
        showToast(
          "الاشتراك في الكورسات متاح للطلاب فقط",
          "info"
        );

        return;
      }

      if (!course) return;

      setAddingToCart(true);

      try {
        await addToCart(
          session.user.id,
          course.id
        );

        showToast(
          "تمت إضافة الكورس إلى السلة",
          "success"
        );
      } catch (error: any) {
        showToast(
          error?.message ||
            "تعذّرت إضافة الكورس للسلة",
          "error"
        );
      } finally {
        setAddingToCart(false);
      }
    };

  /* ---------------------------------------------------------------------- */
  /* Lesson click                                                            */
  /* ---------------------------------------------------------------------- */
  const handleLessonClick = async (
    lesson: Lesson,
    accessible: boolean
  ) => {
    if (!accessible) {
      showToast("اشترك في الكورس لمشاهدة هذا الدرس", "info");
      return;
    }

    // لو الطالب مشترك، يدخل صفحة التعلم عادي
    if (enrolled) {
      navigate(`/app/student/courses/${course!.id}/learn`);
      return;
    }

    // غير مشترك => لازم يكون Preview
    if (!lesson.is_preview) {
      showToast("اشترك في الكورس لمشاهدة هذا الدرس", "info");
      return;
    }

    // تم التحويل من Bunny إلى VdoCipher: الحقل الآن vdocipher_video_id
    const vdocipherVideoId = (
      lesson as Lesson & {
        vdocipher_video_id?: string;
      }
    ).vdocipher_video_id;

    console.log("[Preview] lesson:", lesson);
    console.log("[Preview] vdocipher_video_id:", vdocipherVideoId);

    if (!vdocipherVideoId) {
      showToast("لم يتم ربط فيديو المعاينة بهذا الدرس", "info");
      return;
    }

    setPlayingLesson(lesson);
    setPreviewPlaybackData(null);
    setPreviewLoading(true);

    try {
      console.log("[Preview] Getting VdoCipher playback data...");

      const playbackData = await getLessonPlaybackUrl(vdocipherVideoId);

      console.log("[Preview] playback data:", playbackData);

      if (!playbackData) {
        throw new Error("لم يتم الحصول على بيانات تشغيل الفيديو");
      }

      setPreviewPlaybackData(playbackData);
    } catch (error) {
      console.error("[Preview] Video error:", error);

      setPlayingLesson(null);
      setPreviewPlaybackData(null);

      showToast(
        "حدث خطأ أثناء تحميل فيديو المعاينة",
        "error"
      );
    } finally {
      setPreviewLoading(false);
    }
  };

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                 */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-6">
          <Skeleton className="h-[360px] w-full rounded-[32px]" />

          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-2/3" />
            </div>

            <Skeleton className="h-80 w-full rounded-[28px]" />
          </div>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Course not found                                                        */
  /* ---------------------------------------------------------------------- */

  if (!course) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-6">
        <div className="text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-brand-50 text-brand-600">
            <BookOpen className="h-9 w-9" />
          </div>

          <h2 className="mt-6 text-2xl font-black text-slate-800">
            هذا الكورس غير موجود
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            ربما تم حذف الكورس أو أن الرابط غير صحيح.
          </p>

          <Link
            to="/courses"
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-brand-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-brand-700"
          >
            <ArrowRight className="h-4 w-4" />
            العودة للكورسات
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Thumbnail                                                               */
  /* ---------------------------------------------------------------------- */

  const thumbnail =
    getPublicUrl(
      "course-thumbnails",
      course.thumbnail_path
    );

  const studentsCount =
    Number(
      course.students_count ?? 0
    );

  const collegeMeta =
    COLLEGE_META[course.college as string] ?? DEFAULT_COLLEGE_META;

  const CollegeIcon = collegeMeta.icon;

  /*
   * Preview video فقط.
   *
   * فيديوهات الدروس المدفوعة لا يتم تكوين URL لها هنا.
   * LearningPage هي المسؤولة عن VdoCipher الخاص بالمدفوع.
   */
  const previewEmbedUrl = previewPlaybackData
    ? buildVdoCipherEmbedUrl(previewPlaybackData)
    : null;

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ================================================================== */}
      {/* Hero                                                               */}
      {/* ================================================================== */}

      <section className="relative overflow-hidden bg-slate-950 text-white">
        {/* Background glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-brand-500/20 blur-3xl" />

          <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-sky-500/10 blur-3xl" />

          <div
            className="absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                "linear-gradient(to right, white 1px, transparent 1px), linear-gradient(to bottom, white 1px, transparent 1px)",
              backgroundSize:
                "48px 48px",
            }}
          />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 py-10 sm:px-6 sm:py-16">
          <div className="mb-8">
            <Link
              to="/courses"
              className="inline-flex items-center gap-2 text-xs font-bold text-white/50 transition hover:text-white"
            >
              <ArrowRight className="h-4 w-4" />
              العودة إلى الكورسات
            </Link>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1fr_380px] lg:items-center">
            {/* Hero content */}
            <motion.div
              initial={{
                opacity: 0,
                y: 25,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
              }}
            >
              <Badge color="blue">
                {
                  COLLEGE_LABELS[
                    course.college
                  ]
                }
              </Badge>

              <h1 className="mt-5 max-w-3xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
                {course.title}
              </h1>

              <p className="mt-5 max-w-2xl text-sm leading-8 text-white/65 sm:text-base">
                {course.description}
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold backdrop-blur">
                  <Users className="h-4 w-4 text-brand-300" />

                  {studentsCount.toLocaleString(
                    "ar-EG"
                  )}{" "}
                  طالب
                </div>

                <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold backdrop-blur">
                  <Clock className="h-4 w-4 text-brand-300" />

                  {formatDuration(
                    totalDuration
                  )}
                </div>
              </div>

              <div className="mt-7 flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-brand-500 text-sm font-black">
                  {course.teacher?.full_name?.charAt(
                    0
                  ) || "م"}
                </div>

                <div>
                  <p className="text-[11px] text-white/40">
                    مقدم الكورس
                  </p>

                  <p className="text-sm font-bold text-white">
                    {course.teacher
                      ?.full_name ||
                      "معلم غير محدد"}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* ============================================================ */}
            {/* Purchase Card                                                 */}
            {/* ============================================================ */}

            <motion.div
              initial={{
                opacity: 0,
                y: 35,
              }}
              animate={{
                opacity: 1,
                y: 0,
              }}
              transition={{
                duration: 0.7,
                delay: 0.1,
              }}
              className="relative"
            >
              <div className="overflow-hidden rounded-[30px] border border-white/10 bg-white text-slate-800 shadow-2xl shadow-black/30">
                {/* Thumbnail */}
                <div
                  className={`relative h-52 overflow-hidden bg-gradient-to-br ${collegeMeta.gradient}`}
                >
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={course.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <CollegeIcon className="h-16 w-16 text-white/80" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 to-transparent" />
                </div>

                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <span className="text-3xl font-black text-brand-900">
                      {course.price >
                      0
                        ? formatCurrency(
                            course.price
                          )
                        : "مجانًا"}
                    </span>

                    <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-black text-emerald-600">
                      {course.price >
                      0
                        ? "كورس مدفوع"
                        : "مجاني"}
                    </span>
                  </div>

                  {/* ====================================================== */}
                  {/* Main Action                                             */}
                  {/* ====================================================== */}

                  {enrolled ? (
                    <Link
                      to={`/app/student/courses/${course.id}/learn`}
                    >
                      <Button
                        className="mt-5 h-12 w-full rounded-2xl"
                        size="lg"
                      >
                        <PlayCircle className="h-5 w-5" />

                        متابعة التعلّم
                      </Button>
                    </Link>
                  ) : course.price ===
                    0 ? (
                    <Button
                      className="mt-5 h-12 w-full rounded-2xl"
                      size="lg"
                      isLoading={
                        enrollingFree
                      }
                      onClick={
                        handleFreeEnroll
                      }
                    >
                      <PlayCircle className="h-5 w-5" />

                      ابدأ الكورس مجانًا
                    </Button>
                  ) : (
                    <Button
                      className="mt-5 h-12 w-full rounded-2xl"
                      size="lg"
                      isLoading={
                        addingToCart
                      }
                      onClick={
                        handleAddToCart
                      }
                    >
                      <ShoppingCart className="h-5 w-5" />

                      أضف إلى السلة
                    </Button>
                  )}

                  <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                      {totalLessons}{" "}
                      درسًا داخل الكورس
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                      وصول دائم بعد الاشتراك
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />

                      متابعة تقدمك واختباراتك
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-500">
                      <ShieldCheck className="h-4 w-4 text-brand-500" />

                      محتوى تعليمي متخصص
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ================================================================== */}
      {/* Course Content                                                     */}
      {/* ================================================================== */}

      <main className="mx-auto max-w-6xl px-5 py-12 sm:px-6 sm:py-16">
        <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
          <section>
            <div className="mb-6">
              <span className="text-xs font-black text-brand-600">
                محتوى الكورس
              </span>

              <h2 className="mt-2 text-2xl font-black text-slate-900">
                استكشف المنهج
              </h2>

              <p className="mt-2 text-sm text-slate-500">
                {sections.length}{" "}
                أقسام · {totalLessons}{" "}
                درس
              </p>
            </div>

            <div className="space-y-3">
              {sections.map(
                (section, index) => {
                  const isOpen =
                    openSection ===
                    section.id;

                  return (
                    <motion.div
                      key={section.id}
                      layout
                      className="overflow-hidden rounded-[24px] border border-slate-100 bg-white shadow-sm"
                    >
                      {/* Section Header */}
                      <button
                        type="button"
                        onClick={() =>
                          setOpenSection(
                            isOpen
                              ? null
                              : section.id
                          )
                        }
                        className="flex w-full items-center justify-between gap-4 p-5 text-right transition hover:bg-slate-50"
                      >
                        <div className="flex min-w-0 items-center gap-4">
                          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-sm font-black text-brand-600">
                            {String(
                              index + 1
                            ).padStart(
                              2,
                              "0"
                            )}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate font-black text-slate-800">
                              {
                                section.title
                              }
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              {
                                section
                                  .lessons
                                  ?.length
                              }{" "}
                              دروس
                            </p>
                          </div>
                        </div>

                        <motion.div
                          animate={{
                            rotate:
                              isOpen
                                ? 180
                                : 0,
                          }}
                          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-slate-50"
                        >
                          <ChevronDown className="h-4 w-4 text-slate-500" />
                        </motion.div>
                      </button>

                      {/* Lessons */}
                      <AnimatePresence
                        initial={false}
                      >
                        {isOpen && (
                          <motion.div
                            initial={{
                              height: 0,
                              opacity: 0,
                            }}
                            animate={{
                              height:
                                "auto",
                              opacity: 1,
                            }}
                            exit={{
                              height: 0,
                              opacity: 0,
                            }}
                            transition={{
                              duration:
                                0.25,
                            }}
                          >
                            <div className="border-t border-slate-100">
                              {section.lessons?.map(
                                (
                                  lesson
                                ) => {
                                  /*
                                   * Preview متاح للجميع.
                                   *
                                   * الطالب المشترك:
                                   * متاح له الدخول إلى LearningPage.
                                   *
                                   * تفاصيل الأقساط يتم التحكم بها
                                   * داخل LearningPage.
                                   */
                                  const accessible =
                                    lesson.is_preview ||
                                    enrolled;

                                  return (
                                    <button
                                      type="button"
                                      key={
                                        lesson.id
                                      }
                                      onClick={() =>
                                        handleLessonClick(
                                          lesson,
                                          accessible
                                        )
                                      }
                                      className="group flex w-full items-center justify-between gap-4 border-b border-slate-50 px-5 py-4 text-right last:border-0 transition hover:bg-slate-50"
                                    >
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div
                                          className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl transition ${
                                            accessible
                                              ? "bg-brand-50 text-brand-600 group-hover:bg-brand-600 group-hover:text-white"
                                              : "bg-slate-50 text-slate-300"
                                          }`}
                                        >
                                          {accessible ? (
                                            <PlayCircle className="h-4 w-4" />
                                          ) : (
                                            <Lock className="h-4 w-4" />
                                          )}
                                        </div>

                                        <div className="min-w-0">
                                          <p
                                            className={`truncate text-sm font-semibold ${
                                              accessible
                                                ? "text-slate-700 group-hover:text-brand-600"
                                                : "text-slate-500"
                                            }`}
                                          >
                                            {
                                              lesson.title
                                            }
                                          </p>

                                          {lesson.is_preview && (
                                            <span className="mt-1 inline-flex rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600">
                                              معاينة مجانية
                                            </span>
                                          )}

                                          {enrolled &&
                                            !lesson.is_preview && (
                                              <span className="mt-1 inline-flex rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                                                متاح للمشتركين
                                              </span>
                                            )}
                                        </div>
                                      </div>

                                      <span className="shrink-0 text-xs text-slate-400">
                                        {formatDuration(
                                          lesson.duration_seconds
                                        )}
                                      </span>
                                    </button>
                                  );
                                }
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                }
              )}
            </div>
          </section>

          {/* ================================================================= */}
          {/* Side info                                                          */}
          {/* ================================================================= */}

          <aside className="hidden lg:block">
            <div className="sticky top-24 rounded-[26px] border border-slate-100 bg-white p-6 shadow-sm">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <GraduationCap className="h-6 w-6" />
              </div>

              <h3 className="mt-5 font-black text-slate-800">
                عن هذا الكورس
              </h3>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    الدروس
                  </span>

                  <span className="font-bold text-slate-700">
                    {totalLessons}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    المدة
                  </span>

                  <span className="font-bold text-slate-700">
                    {formatDuration(
                      totalDuration
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">
                    الطلاب
                  </span>

                  <span className="font-bold text-slate-700">
                    {studentsCount}
                  </span>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      {/* ================================================================== */}
      {/* Free Preview Player                                                */}
      {/* ================================================================== */}
      <Modal
        open={!!playingLesson}
        onClose={() => {
          setPlayingLesson(null);
          setPreviewPlaybackData(null);
          setPreviewLoading(false);
        }}
        title={playingLesson?.title ?? "معاينة الدرس"}
      >
        <div className="space-y-4">
          {previewLoading ? (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-black">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />

                <span className="text-sm">
                  جاري تحميل فيديو المعاينة...
                </span>
              </div>
            </div>
          ) : previewEmbedUrl ? (
            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
              <iframe
                key={previewEmbedUrl}
                src={previewEmbedUrl}
                title={playingLesson?.title ?? "فيديو المعاينة"}
                className="aspect-video w-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-950">
              <div className="text-center text-white">
                <Video className="mx-auto mb-3 h-10 w-10 opacity-70" />

                <p className="text-sm text-white/70">
                  لا يمكن تشغيل فيديو المعاينة حاليًا
                </p>
              </div>
            </div>
          )}

          {playingLesson && (
            <div className="rounded-xl bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100">
                  <Play className="h-5 w-5 text-primary-600" />
                </div>

                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-900">
                    {playingLesson.title}
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    فيديو معاينة مجاني
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}