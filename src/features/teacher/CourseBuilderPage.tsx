import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Trash2,
  UploadCloud,
  Eye,
  EyeOff,
  ClipboardList,
  ChevronDown,
  Video,
  CheckCircle2,
  Layers,
  BookOpen,
  Sparkles,
  ArrowRight,
  PlayCircle,
  CircleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/contexts/ToastContext";

import {
  fetchSections,
  createSection,
  deleteSection,
  updateSectionTitle,
  createLesson,
  deleteLesson,
  updateLessonTitle,
  setPreview,
  uploadLessonVideo,
} from "@/services/teacherCourses";

import { fetchCourseBySlugOrId } from "@/services/coursesById";
import type { Course, CourseSection, Lesson } from "@/types";
import { formatDuration } from "@/utils/format";

export default function CourseBuilderPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const { showToast } = useToast();

  const [course, setCourse] = useState<Course | null>(null);
  const [sections, setSections] = useState<CourseSection[]>([]);
  const [loading, setLoading] = useState(true);

  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [lessonModalSection, setLessonModalSection] = useState<string | null>(null);

  const [lessonForm, setLessonForm] = useState({
    title: "",
    description: "",
    isPreview: false,
  });

  const [uploadTarget, setUploadTarget] = useState<Lesson | null>(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    if (!courseId) return;

    setLoading(true);

    try {
      const [c, sec] = await Promise.all([
        fetchCourseBySlugOrId(courseId),
        fetchSections(courseId),
      ]);

      setCourse(c);
      setSections(sec);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  const handleAddSection = async () => {
    if (!courseId || !newSectionTitle.trim()) {
      showToast("اكتب اسم القسم أولًا", "error");
      return;
    }

    try {
      await createSection(
        courseId,
        newSectionTitle.trim(),
        sections.length
      );

      setNewSectionTitle("");

      showToast("تمت إضافة القسم بنجاح", "success");

      load();
    } catch {
      showToast("تعذّر إضافة القسم", "error");
    }
  };

  const handleAddLesson = async () => {
    if (!lessonModalSection || !lessonForm.title.trim()) {
      showToast("اكتب عنوان الدرس أولًا", "error");
      return;
    }

    const section = sections.find(
      (s) => s.id === lessonModalSection
    );

    try {
      await createLesson({
        sectionId: lessonModalSection,
        title: lessonForm.title.trim(),
        description: lessonForm.description.trim(),
        orderIndex: section?.lessons?.length ?? 0,
        isPreview: lessonForm.isPreview,
      });

      setLessonForm({
        title: "",
        description: "",
        isPreview: false,
      });

      setLessonModalSection(null);

      showToast("تمت إضافة الدرس بنجاح", "success");

      load();
    } catch {
      showToast("تعذّر إضافة الدرس", "error");
    }
  };

  const handleUploadVideo = async (file: File) => {
    if (!uploadTarget || !course) return;

    setUploading(true);

    try {
      await uploadLessonVideo(
        course.id,
        uploadTarget.id,
        file
      );

      showToast("تم رفع الفيديو بنجاح", "success");

      setUploadTarget(null);

      load();
    } catch (err) {
      console.error("Upload lesson video failed:", err);

      showToast(
        "تعذّر رفع الفيديو، تأكد من حجم الملف والصيغة",
        "error"
      );
    } finally {
      setUploading(false);
    }
  };

  const stats = useMemo(() => {
    const lessons = sections.flatMap(
      (section) => section.lessons ?? []
    );

    const totalLessons = lessons.length;

    const videos = lessons.filter(
      (lesson) => !!lesson.video_path
    ).length;

    const previews = lessons.filter(
      (lesson) => lesson.is_preview
    ).length;

    const completion =
      totalLessons > 0
        ? Math.round((videos / totalLessons) * 100)
        : 0;

    return {
      totalLessons,
      videos,
      previews,
      completion,
    };
  }, [sections]);

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-28 rounded-3xl" />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton
              key={i}
              className="h-28 rounded-2xl"
            />
          ))}
        </div>

        <Skeleton className="h-40 rounded-3xl" />
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="space-y-6 pb-10">

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-900 via-brand-800 to-slate-900 p-6 text-white shadow-lg">
        <div className="absolute -left-16 -top-16 h-40 w-40 rounded-full bg-brand-400/20 blur-3xl" />
        <div className="absolute -bottom-20 right-10 h-48 w-48 rounded-full bg-cyan-400/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

          <div>
            <Link
              to="/app/teacher/courses"
              className="mb-3 inline-flex items-center gap-1 text-xs text-white/60 hover:text-white"
            >
              <ArrowRight className="h-3.5 w-3.5" />
              العودة إلى كورساتي
            </Link>

            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur">
                <BookOpen className="h-6 w-6 text-brand-300" />
              </div>

              <div>
                <h1 className="text-2xl font-black">
                  {course.title}
                </h1>

                <p className="mt-1 text-sm text-white/60">
                  إدارة محتوى الكورس
                </p>
              </div>
            </div>
          </div>

          <Link
            to={`/app/teacher/courses/${course.id}/quiz-builder`}
          >
            <Button variant="secondary">
              <ClipboardList className="h-4 w-4" />
              إدارة الاختبارات
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

        <StatCard
          icon={<Layers />}
          title="الأقسام"
          value={sections.length}
          description="قسم داخل الكورس"
          iconClass="bg-brand-50 text-brand-500"
        />

        <StatCard
          icon={<Video />}
          title="الدروس"
          value={stats.totalLessons}
          description="إجمالي الدروس"
          iconClass="bg-blue-50 text-blue-500"
        />

        <StatCard
          icon={<CheckCircle2 />}
          title="الفيديوهات"
          value={stats.videos}
          description={`${stats.completion}% من المحتوى جاهز`}
          iconClass="bg-emerald-50 text-emerald-500"
        />

        <StatCard
          icon={<Eye />}
          title="المعاينات"
          value={stats.previews}
          description="دروس مجانية للزوار"
          iconClass="bg-amber-50 text-amber-500"
        />
      </div>

      {/* Progress */}
      {stats.totalLessons > 0 && (
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-brand-500" />
                <h2 className="font-bold text-slate-800">
                  جاهزية محتوى الكورس
                </h2>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                أضف فيديوهات لجميع الدروس قبل نشر الكورس
              </p>
            </div>

            <span className="text-lg font-black text-brand-600">
              {stats.completion}%
            </span>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${stats.completion}%` }}
              transition={{ duration: 0.8 }}
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-emerald-500"
            />
          </div>
        </div>
      )}

      {/* Add Section */}
      <div className="rounded-3xl border border-dashed border-brand-200 bg-brand-50/40 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Plus className="h-4 w-4 text-brand-500" />
          <h2 className="font-bold text-brand-900">
            إضافة قسم جديد
          </h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="مثال: الوحدة الأولى - Anatomy"
            value={newSectionTitle}
            onChange={(e) =>
              setNewSectionTitle(e.target.value)
            }
          />

          <Button
            onClick={handleAddSection}
            className="sm:min-w-[130px]"
          >
            <Plus className="h-4 w-4" />
            إضافة القسم
          </Button>
        </div>
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {sections.length === 0 ? (
          <div className="rounded-3xl border border-slate-100 bg-white p-12 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <Layers className="h-7 w-7" />
            </div>

            <h3 className="mt-4 font-bold text-slate-800">
              لا توجد أقسام حتى الآن
            </h3>

            <p className="mt-1 text-sm text-slate-400">
              ابدأ بإضافة أول قسم للكورس
            </p>
          </div>
        ) : (
          sections.map((section, index) => (
            <motion.div
              key={section.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <SectionBlock
                section={section}
                onAddLesson={() =>
                  setLessonModalSection(section.id)
                }
                onDeleteSection={async () => {
                  await deleteSection(section.id);
                  showToast("تم حذف القسم", "success");
                  load();
                }}
                onRenameSection={async (newTitle) => {
                  await updateSectionTitle(section.id, newTitle);
                  showToast("تم تعديل اسم القسم", "success");
                  load();
                }}
                onDeleteLesson={async (lessonId) => {
                  await deleteLesson(lessonId);
                  showToast("تم حذف الدرس", "success");
                  load();
                }}
                onRenameLesson={async (lessonId, newTitle) => {
                  await updateLessonTitle(lessonId, newTitle);
                  showToast("تم تعديل اسم الدرس", "success");
                  load();
                }}
                onTogglePreview={async (lesson) => {
                  await setPreview(
                    lesson.id,
                    !lesson.is_preview
                  );

                  showToast(
                    lesson.is_preview
                      ? "تم إلغاء المعاينة المجانية"
                      : "تم تفعيل المعاينة المجانية",
                    "success"
                  );

                  load();
                }}
                onUploadClick={setUploadTarget}
              />
            </motion.div>
          ))
        )}
      </div>

      {/* Lesson Modal */}
      <Modal
        open={!!lessonModalSection}
        onClose={() => setLessonModalSection(null)}
        title="إضافة درس جديد"
      >
        <div className="space-y-4">

          <Input
            label="عنوان الدرس"
            placeholder="مثال: Introduction to Anatomy"
            value={lessonForm.title}
            onChange={(e) =>
              setLessonForm({
                ...lessonForm,
                title: e.target.value,
              })
            }
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">
              وصف مختصر
            </label>

            <textarea
              rows={3}
              placeholder="اكتب وصفًا مختصرًا للدرس..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={lessonForm.description}
              onChange={(e) =>
                setLessonForm({
                  ...lessonForm,
                  description: e.target.value,
                })
              }
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={lessonForm.isPreview}
              onChange={(e) =>
                setLessonForm({
                  ...lessonForm,
                  isPreview: e.target.checked,
                })
              }
              className="h-4 w-4 accent-brand-500"
            />

            <div>
              <p className="text-sm font-bold text-slate-700">
                معاينة مجانية
              </p>

              <p className="text-xs text-slate-400">
                السماح للزائر بمشاهدة هذا الدرس قبل الاشتراك
              </p>
            </div>
          </label>

          <Button
            className="w-full"
            onClick={handleAddLesson}
          >
            <Plus className="h-4 w-4" />
            إضافة الدرس
          </Button>
        </div>
      </Modal>

      {/* Upload */}
      <Modal
        open={!!uploadTarget}
        onClose={() =>
          !uploading && setUploadTarget(null)
        }
        title={`رفع فيديو: ${uploadTarget?.title ?? ""}`}
      >
        <label className="group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-10 text-center transition hover:border-brand-300 hover:bg-brand-50/40">

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 transition group-hover:scale-110">
            <UploadCloud className="h-7 w-7" />
          </div>

          <div>
            <p className="font-bold text-slate-700">
              اختر فيديو الدرس
            </p>

            <p className="mt-1 text-xs text-slate-400">
              MP4 / WebM / MOV
            </p>
          </div>

          <input
            type="file"
            accept="video/*"
            className="hidden"
            disabled={uploading}
            onChange={(e) =>
              e.target.files?.[0] &&
              handleUploadVideo(e.target.files[0])
            }
          />
        </label>

        {uploading && (
          <div className="mt-4 rounded-2xl bg-brand-50 p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-sm font-semibold text-brand-600">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
              جاري رفع الفيديو...
            </div>

            <p className="mt-1 text-xs text-brand-400">
              لا تغلق الصفحة حتى يكتمل الرفع
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}

function StatCard({
  icon,
  title,
  value,
  description,
  iconClass,
}: {
  icon: React.ReactNode;
  title: string;
  value: number;
  description: string;
  iconClass: string;
}) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">
            {title}
          </p>

          <p className="mt-2 text-2xl font-black text-slate-800">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-400">
            {description}
          </p>
        </div>

        <div
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

function SectionBlock({
  section,
  onAddLesson,
  onDeleteSection,
  onRenameSection,
  onDeleteLesson,
  onRenameLesson,
  onTogglePreview,
  onUploadClick,
}: {
  section: CourseSection;
  onAddLesson: () => void;
  onDeleteSection: () => void;
  onRenameSection: (newTitle: string) => Promise<void>;
  onDeleteLesson: (lessonId: string) => void;
  onRenameLesson: (lessonId: string, newTitle: string) => Promise<void>;
  onTogglePreview: (lesson: Lesson) => void;
  onUploadClick: (lesson: Lesson) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editingSection, setEditingSection] = useState(false);
  const [sectionTitleDraft, setSectionTitleDraft] = useState(section.title);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitleDraft, setLessonTitleDraft] = useState("");

  const lessons = section.lessons ?? [];
  const lessonCount = lessons.length;

  const withVideo = lessons.filter(
    (lesson) => !!lesson.video_path
  ).length;

  const previews = lessons.filter(
    (lesson) => lesson.is_preview
  ).length;

  const completion =
    lessonCount > 0
      ? Math.round((withVideo / lessonCount) * 100)
      : 0;

  const saveSectionTitle = async () => {
    const trimmed = sectionTitleDraft.trim();

    if (!trimmed || trimmed === section.title) {
      setSectionTitleDraft(section.title);
      setEditingSection(false);
      return;
    }

    await onRenameSection(trimmed);
    setEditingSection(false);
  };

  const startEditingLesson = (lesson: Lesson) => {
    setEditingLessonId(lesson.id);
    setLessonTitleDraft(lesson.title);
  };

  const saveLessonTitle = async (lesson: Lesson) => {
    const trimmed = lessonTitleDraft.trim();

    if (!trimmed || trimmed === lesson.title) {
      setEditingLessonId(null);
      return;
    }

    await onRenameLesson(lesson.id, trimmed);
    setEditingLessonId(null);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm">

      {/* Section header */}
      <div className="p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">

          <div className="flex min-w-0 items-center gap-3">
            <button
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-500"
              onClick={() => setOpen(!open)}
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  open ? "rotate-180" : ""
                }`}
              />
            </button>

            <div className="min-w-0 flex-1">
              {editingSection ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={sectionTitleDraft}
                    onChange={(e) =>
                      setSectionTitleDraft(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveSectionTitle();
                      if (e.key === "Escape") {
                        setSectionTitleDraft(section.title);
                        setEditingSection(false);
                      }
                    }}
                    className="w-full rounded-lg border border-brand-300 px-2.5 py-1.5 text-sm font-bold text-slate-800 outline-none focus:ring-2 focus:ring-brand-500/20"
                  />

                  <button
                    onClick={saveSectionTitle}
                    className="shrink-0 rounded-lg bg-brand-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-brand-600"
                  >
                    حفظ
                  </button>

                  <button
                    onClick={() => {
                      setSectionTitleDraft(section.title);
                      setEditingSection(false);
                    }}
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="cursor-pointer truncate font-bold text-slate-800 hover:text-brand-600"
                    onClick={() => setEditingSection(true)}
                    title="اضغط للتعديل"
                  >
                    {section.title}
                  </h2>

                  <button
                    onClick={() => setEditingSection(true)}
                    className="shrink-0 text-xs text-slate-300 hover:text-brand-500"
                    title="تعديل اسم القسم"
                  >
                    ✎
                  </button>

                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">
                    {lessonCount} درس
                  </span>

                  {previews > 0 && (
                    <span className="rounded-full bg-amber-50 px-2.5 py-1 text-[10px] font-bold text-amber-600">
                      {previews} معاينة
                    </span>
                  )}
                </div>
              )}

              {!editingSection && (
                <p className="mt-1 text-xs text-slate-400">
                  {withVideo} من {lessonCount} فيديو جاهز
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={onAddLesson}
            >
              <Plus className="h-3.5 w-3.5" />
              إضافة درس
            </Button>

            <Button
              size="sm"
              variant="outline"
              onClick={onDeleteSection}
            >
              <Trash2 className="h-3.5 w-3.5 text-red-500" />
            </Button>
          </div>
        </div>

        {lessonCount > 0 && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500 transition-all"
              style={{ width: `${completion}%` }}
            />
          </div>
        )}
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-t border-slate-100"
          >
            {lessonCount === 0 ? (
              <div className="flex flex-col items-center justify-center px-5 py-10 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50">
                  <Video className="h-5 w-5 text-slate-300" />
                </div>

                <p className="mt-3 text-sm font-semibold text-slate-500">
                  لا توجد دروس في هذا القسم
                </p>

                <button
                  onClick={onAddLesson}
                  className="mt-2 text-xs font-bold text-brand-500 hover:underline"
                >
                  + أضف أول درس
                </button>
              </div>
            ) : (
              lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="group flex flex-col gap-3 border-b border-slate-50 px-5 py-4 last:border-0 hover:bg-slate-50/70 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-center gap-3">

                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-400">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      {editingLessonId === lesson.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={lessonTitleDraft}
                            onChange={(e) =>
                              setLessonTitleDraft(e.target.value)
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter")
                                saveLessonTitle(lesson);
                              if (e.key === "Escape")
                                setEditingLessonId(null);
                            }}
                            className="w-full rounded-lg border border-brand-300 px-2.5 py-1 text-sm font-semibold text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                          />

                          <button
                            onClick={() => saveLessonTitle(lesson)}
                            className="shrink-0 rounded-lg bg-brand-500 px-2 py-1 text-xs font-bold text-white hover:bg-brand-600"
                          >
                            حفظ
                          </button>

                          <button
                            onClick={() => setEditingLessonId(null)}
                            className="shrink-0 rounded-lg px-2 py-1 text-xs text-slate-400 hover:text-slate-600"
                          >
                            إلغاء
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="cursor-pointer font-semibold text-slate-700 hover:text-brand-600"
                            onClick={() => startEditingLesson(lesson)}
                            title="اضغط للتعديل"
                          >
                            {lesson.title}
                          </span>

                          <button
                            onClick={() => startEditingLesson(lesson)}
                            className="text-xs text-slate-300 hover:text-brand-500"
                            title="تعديل اسم الدرس"
                          >
                            ✎
                          </button>

                          {lesson.is_preview && (
                            <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-bold text-brand-600">
                              معاينة مجانية
                            </span>
                          )}

                          {lesson.duration_seconds > 0 && (
                            <span className="text-[11px] text-slate-400">
                              {formatDuration(
                                lesson.duration_seconds
                              )}
                            </span>
                          )}
                        </div>
                      )}

                      {editingLessonId !== lesson.id && (
                        <div className="mt-1 flex items-center gap-1.5">
                          {lesson.video_path ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span className="text-[11px] font-medium text-emerald-600">
                                الفيديو جاهز
                              </span>
                            </>
                          ) : (
                            <>
                              <CircleAlert className="h-3 w-3 text-amber-500" />
                              <span className="text-[11px] font-medium text-amber-600">
                                يحتاج فيديو
                              </span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() =>
                        onTogglePreview(lesson)
                      }
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-brand-500 hover:shadow-sm"
                      title="المعاينة المجانية"
                    >
                      {lesson.is_preview ? (
                        <Eye className="h-4 w-4 text-brand-500" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </button>

                    <button
                      onClick={() =>
                        onUploadClick(lesson)
                      }
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-brand-500 hover:shadow-sm"
                      title="رفع فيديو"
                    >
                      <UploadCloud className="h-4 w-4" />
                    </button>

                    <button
                      onClick={() =>
                        onDeleteLesson(lesson.id)
                      }
                      className="rounded-xl p-2 text-red-400 transition hover:bg-red-50 hover:text-red-500"
                      title="حذف الدرس"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
