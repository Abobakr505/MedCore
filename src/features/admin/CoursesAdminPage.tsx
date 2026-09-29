import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  CircleDollarSign,
  Eye,
  FileStack,
  GraduationCap,
  Layers,
  Loader2,
  Pencil,
  Play,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Upload,
  Users,
  Video,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";

import { useToast } from "@/contexts/ToastContext";

import { fetchAllCoursesAdmin, adminDeleteCourse } from "@/services/admin";

import {
  fetchSections,
  createSection,
  updateSection,
  deleteSection,
  createLesson,
  updateLesson,
  deleteLesson,
  updateCourse,
  uploadLessonVideoVdoCipher,
  deleteLessonVideoVdoCipher,
  subscribeVideoUploads,
  getVideoUploadsSnapshot,
  isVideoUploading,
  type VideoUploadTask,
} from "@/services/teacherCourses";

import {
  getLessonPlaybackUrl,
  type VdoCipherPlaybackData,
} from "@/services/videoPlayback";

import { COLLEGE_LABELS } from "@/types";
import { formatCurrency } from "@/utils/format";

/* -------------------------------------------------------------------------- */
/* Types & helpers                                                            */
/* -------------------------------------------------------------------------- */

interface LessonItem {
  id: string;
  section_id: string;
  title: string;
  description: string | null;
  is_preview: boolean;
  order_index: number | null;
  duration_seconds?: number | null;
  vdocipher_video_id?: string | null;
  created_at?: string;
}

interface SectionItem {
  id: string;
  course_id: string;
  title: string;
  order_index: number | null;
  unlock_month?: number | null;
  lessons: LessonItem[];
}

interface ConfirmState {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}

type AskConfirm = (options: Omit<ConfirmState, "open">) => void;

const CLOSED_CONFIRM: ConfirmState = {
  open: false,
  title: "",
  description: "",
  confirmLabel: "حذف",
  onConfirm: () => {},
};

const FILE_BUCKET = "course-files";

/* ---- إعدادات بانر "الجديد" ---- */
const NEW_WINDOW_HOURS = 48; // أي عنصر خلال هذه المدة يعتبر "جديد"
const REFRESH_INTERVAL_MS = 60_000; // تحديث تلقائي كل دقيقة
const BANNER_PREVIEW_COUNT = 5; // عدد العناصر الظاهرة قبل "عرض الكل"
const LAST_SEEN_KEY = "admin_courses_last_seen";

type ActivityKind = "course" | "section" | "lesson";

interface ActivityItem {
  key: string;
  kind: ActivityKind;
  at: string;
  courseId: string | null;
  courseTitle: string;
  sectionTitle?: string;
  lessonTitle?: string;
  hasVideo?: boolean;
}

interface RecentContent {
  sections: any[];
  lessons: any[];
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

function formatDuration(seconds?: number | null) {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")} د`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);

  if (minutes < 1) return "الآن";
  if (minutes < 60) return minutes === 1 ? "منذ دقيقة" : `منذ ${minutes} دقيقة`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours === 1 ? "منذ ساعة" : `منذ ${hours} ساعة`;

  const days = Math.floor(hours / 24);
  return days === 1 ? "منذ يوم" : `منذ ${days} يوم`;
}

/**
 * بناء رابط تشغيل VdoCipher (iframe embed) من otp + playbackInfo.
 * نفس الدالة المستخدمة في صفحة تفاصيل الكورس.
 */
function buildVdoCipherEmbedUrl(playbackData: VdoCipherPlaybackData): string {
  const params = new URLSearchParams({
    otp: playbackData.otp,
    playbackInfo: playbackData.playbackInfo,
  });

  return `https://player.vdocipher.com/v2/?${params.toString()}`;
}

/**
 * يجلب الأقسام والدروس المضافة حديثًا من كل الكورسات.
 * لو عمود created_at غير موجود في أحد الجدولين، بيرجع قائمة فاضية بدون ما يكسر الصفحة.
 */
async function fetchRecentContent(sinceIso: string): Promise<RecentContent> {
  const [sectionsRes, lessonsRes] = await Promise.all([
    supabase
      .from("sections")
      .select("id, title, course_id, created_at")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false }),

    supabase
      .from("lessons")
      .select(
        "id, title, created_at, vdocipher_video_id, section:sections(id, title, course_id)"
      )
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false }),
  ]);

  return {
    sections: sectionsRes.error ? [] : sectionsRes.data ?? [],
    lessons: lessonsRes.error ? [] : lessonsRes.data ?? [],
  };
}

/**
 * تنظيف أي ملفات قديمة مرتبطة بدروس سيتم حذفها
 * (الأدمن لا يرفع ملفات، لكن قد تكون موجودة من المدرس).
 * Best effort: لا يوقف الحذف لو فشل.
 */
async function removeLessonFiles(lessonIds: string[]) {
  if (lessonIds.length === 0) return;

  try {
    const { data } = await supabase
      .from("lesson_files")
      .select("file_path")
      .in("lesson_id", lessonIds);

    const paths = (data ?? []).map((f: any) => f.file_path).filter(Boolean);

    if (paths.length) {
      await supabase.storage.from(FILE_BUCKET).remove(paths);
    }

    await supabase.from("lesson_files").delete().in("lesson_id", lessonIds);
  } catch (error) {
    console.warn("Lesson files cleanup warning:", error);
  }
}

/* -------------------------------------------------------------------------- */
/* Lesson Card                                                                */
/* -------------------------------------------------------------------------- */

function LessonCard({
  lesson,
  index,
  task,
  onRefresh,
  askConfirm,
}: {
  lesson: LessonItem;
  index: number;
  task?: VideoUploadTask;
  onRefresh: () => Promise<void>;
  askConfirm: AskConfirm;
}) {
  const { showToast } = useToast();

  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(lesson.title);
  const [description, setDescription] = useState(lesson.description ?? "");
  const [saving, setSaving] = useState(false);

  // معاينة الفيديو
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewData, setPreviewData] = useState<VdoCipherPlaybackData | null>(
    null
  );
  const [previewError, setPreviewError] = useState<string | null>(null);

  const hasVideo = Boolean(lesson.vdocipher_video_id);

  const isUploading =
    !!task &&
    (task.status === "preparing" ||
      task.status === "uploading" ||
      task.status === "saving");

  useEffect(() => {
    if (!editing) {
      setTitle(lesson.title);
      setDescription(lesson.description ?? "");
    }
  }, [lesson.title, lesson.description, editing]);

  const closePreview = () => {
    setPreviewOpen(false);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(false);
  };

  // لو الفيديو اتحذف أو اتغيّر والمعاينة مفتوحة، نقفلها
  useEffect(() => {
    if (previewOpen && !lesson.vdocipher_video_id) closePreview();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lesson.vdocipher_video_id]);

  const openPreview = async () => {
    const videoId = lesson.vdocipher_video_id;

    if (!videoId) {
      showToast("لا يوجد فيديو لهذا الدرس", "info");
      return;
    }

    setPreviewOpen(true);
    setPreviewData(null);
    setPreviewError(null);
    setPreviewLoading(true);

    try {
      // كل مرة نجيب OTP جديد لأنه بينتهي بسرعة
      const playbackData = await getLessonPlaybackUrl(videoId);

      if (!playbackData) {
        throw new Error("لم يتم الحصول على بيانات تشغيل الفيديو");
      }

      setPreviewData(playbackData);
    } catch (error) {
      console.error("[Admin Preview] Video error:", error);
      setPreviewError(errorMessage(error, "حدث خطأ أثناء تحميل الفيديو"));
    } finally {
      setPreviewLoading(false);
    }
  };

  const previewEmbedUrl = previewData
    ? buildVdoCipherEmbedUrl(previewData)
    : null;

  const saveEdit = async () => {
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      showToast("اسم الدرس مطلوب", "error");
      return;
    }

    setSaving(true);

    try {
      await updateLesson(lesson.id, {
        title: cleanTitle,
        description: description.trim(),
      });

      showToast("تم حفظ تعديلات الدرس", "success");
      setEditing(false);
      await onRefresh();
    } catch (error) {
      showToast(errorMessage(error, "تعذر حفظ تعديلات الدرس"), "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePreview = async () => {
    try {
      await updateLesson(lesson.id, { isPreview: !lesson.is_preview });

      showToast(
        lesson.is_preview
          ? "تم إلغاء المعاينة المجانية"
          : "تم تفعيل المعاينة المجانية",
        "success"
      );

      await onRefresh();
    } catch (error) {
      showToast(errorMessage(error, "تعذر تحديث المعاينة"), "error");
    }
  };

  const uploadVideo = () => {
    if (isVideoUploading(lesson.id)) {
      showToast("جاري رفع فيديو لهذا الدرس بالفعل", "error");
      return;
    }

    // لازم الـ input يكون في الـ DOM أثناء الاختيار
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.style.display = "none";
    document.body.appendChild(input);

    input.addEventListener("cancel", () => input.remove(), { once: true });

    input.addEventListener(
      "change",
      async () => {
        const file = input.files?.[0];
        input.remove();

        if (!file) return;

        try {
          // التقدم يظهر من الـ store العام، والتحديث بعد النجاح تلقائي
          await uploadLessonVideoVdoCipher(lesson.id, file);
          showToast("تم رفع الفيديو بنجاح", "success");
        } catch (error) {
          showToast(errorMessage(error, "حدث خطأ أثناء رفع الفيديو"), "error");
        }
      },
      { once: true }
    );

    input.click();
  };

  const deleteVideo = () => {
    askConfirm({
      title: "حذف فيديو الدرس",
      description:
        "هل أنت متأكد من حذف فيديو هذا الدرس؟ لا يمكن التراجع عن هذا الإجراء.",
      confirmLabel: "حذف الفيديو",
      onConfirm: async () => {
        try {
          await deleteLessonVideoVdoCipher(lesson.id);
          showToast("تم حذف الفيديو بنجاح", "success");
          await onRefresh();
        } catch (error) {
          showToast(errorMessage(error, "تعذر حذف الفيديو"), "error");
        }
      },
    });
  };

  const removeLesson = () => {
    if (isVideoUploading(lesson.id)) {
      showToast("لا يمكن حذف الدرس أثناء رفع الفيديو", "error");
      return;
    }

    askConfirm({
      title: "حذف الدرس",
      description: `هل أنت متأكد من حذف "${lesson.title}"؟ سيتم حذف الدرس وفيديوه نهائيًا.`,
      confirmLabel: "حذف الدرس",
      onConfirm: async () => {
        try {
          await removeLessonFiles([lesson.id]);
          await deleteLesson(lesson.id);
          showToast("تم حذف الدرس بنجاح", "success");
          await onRefresh();
        } catch (error) {
          showToast(errorMessage(error, "تعذر حذف الدرس"), "error");
        }
      },
    });
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <span className="text-sm font-bold">{index + 1}</span>
          </div>

          <div className="min-w-0 flex-1">
            {editing ? (
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    اسم الدرس
                  </label>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    autoFocus
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-900 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-slate-600">
                    تفاصيل الدرس
                  </label>
                  <textarea
                    rows={3}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-700 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving || !title.trim()}
                    onClick={saveEdit}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    حفظ التعديلات
                  </button>

                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => setEditing(false)}
                    className="inline-flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                    إلغاء
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate font-bold text-slate-900">
                    {lesson.title}
                  </h4>

                  {lesson.is_preview && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">
                      <Eye className="h-3 w-3" />
                      معاينة مجانية
                    </span>
                  )}
                </div>

                {lesson.description && (
                  <p className="mt-1 line-clamp-2 text-sm leading-6 text-slate-500">
                    {lesson.description}
                  </p>
                )}
              </>
            )}

            <div className="mt-3 flex flex-wrap gap-2">
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium ${
                  hasVideo
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {hasVideo ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <Video className="h-3.5 w-3.5" />
                )}
                {hasVideo ? "الفيديو مرفوع" : "لا يوجد فيديو"}
              </span>

              {formatDuration(lesson.duration_seconds) && (
                <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600">
                  {formatDuration(lesson.duration_seconds)}
                </span>
              )}
            </div>
          </div>
        </div>

        {!editing && (
          <div className="flex flex-wrap gap-2 lg:justify-end">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <Pencil className="h-3.5 w-3.5" />
              تعديل
            </button>

            {hasVideo && (
              <button
                type="button"
                disabled={isUploading}
                onClick={openPreview}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-700 transition hover:bg-sky-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <PlayCircle className="h-3.5 w-3.5" />
                معاينة الفيديو
              </button>
            )}

            <button
              type="button"
              onClick={togglePreview}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                lesson.is_preview
                  ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              <Eye className="h-3.5 w-3.5" />
              {lesson.is_preview ? "إلغاء المعاينة" : "تفعيل المعاينة"}
            </button>

            <button
              type="button"
              disabled={isUploading}
              onClick={uploadVideo}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {isUploading
                ? "جاري الرفع..."
                : hasVideo
                ? "استبدال الفيديو"
                : "رفع الفيديو"}
            </button>

            {hasVideo && (
              <button
                type="button"
                disabled={isUploading}
                onClick={deleteVideo}
                className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                حذف الفيديو
              </button>
            )}

            <button
              type="button"
              disabled={isUploading}
              onClick={removeLesson}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف الدرس
            </button>
          </div>
        )}
      </div>

      {isUploading && task && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs">
            <span className="truncate text-blue-800">
              {task.fileName}
              {task.status === "saving" && " (جاري الحفظ...)"}
              {task.attempt > 1 &&
                task.status === "uploading" &&
                ` (محاولة ${task.attempt}/${task.maxAttempts})`}
            </span>
            <span className="font-bold text-blue-700">{task.progress}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{ width: `${task.progress}%` }}
            />
          </div>
        </div>
      )}

      {task?.error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {task.error}
        </div>
      )}

      {/* Video preview player */}
      <Modal
        open={previewOpen}
        onClose={closePreview}
        title={lesson.title || "معاينة الفيديو"}
      >
        <div className="space-y-4">
          {previewLoading ? (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-black">
              <div className="flex flex-col items-center gap-3 text-white">
                <Loader2 className="h-8 w-8 animate-spin" />
                <span className="text-sm">جاري تحميل الفيديو...</span>
              </div>
            </div>
          ) : previewEmbedUrl ? (
            <div className="overflow-hidden rounded-2xl bg-black shadow-2xl">
              <iframe
                key={previewEmbedUrl}
                src={previewEmbedUrl}
                title={lesson.title || "معاينة الفيديو"}
                className="aspect-video w-full border-0"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="flex aspect-video items-center justify-center rounded-2xl bg-slate-950 px-4">
              <div className="text-center text-white">
                <Video className="mx-auto mb-3 h-10 w-10 opacity-70" />

                <p className="text-sm text-white/70">
                  {previewError || "لا يمكن تشغيل الفيديو حاليًا"}
                </p>

                <p className="mt-2 text-xs text-white/40">
                  لو الفيديو لسه مرفوع حديثًا، ممكن يكون VdoCipher لسه بيعالجه.
                  جرّب بعد دقيقة.
                </p>

                <button
                  type="button"
                  onClick={openPreview}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2 text-xs font-bold text-white transition hover:bg-white/20"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  المحاولة مرة أخرى
                </button>
              </div>
            </div>
          )}

          <div className="rounded-xl bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50">
                <Play className="h-5 w-5 text-brand-600" />
              </div>

              <div className="min-w-0">
                <h3 className="truncate font-bold text-slate-900">
                  {lesson.title}
                </h3>

                <p className="mt-1 text-xs text-slate-500">
                  معاينة الأدمن لفيديو الدرس
                  {formatDuration(lesson.duration_seconds)
                    ? ` · ${formatDuration(lesson.duration_seconds)}`
                    : ""}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section Block                                                              */
/* -------------------------------------------------------------------------- */

function SectionBlock({
  section,
  index,
  uploads,
  onRefresh,
  askConfirm,
}: {
  section: SectionItem;
  index: number;
  uploads: Record<string, VideoUploadTask>;
  onRefresh: () => Promise<void>;
  askConfirm: AskConfirm;
}) {
  const { showToast } = useToast();

  const [expanded, setExpanded] = useState(true);
  const [saving, setSaving] = useState(false);

  const [editingTitle, setEditingTitle] = useState(false);
  const [sectionTitle, setSectionTitle] = useState(section.title);

  const [unlockMonth, setUnlockMonth] = useState<number>(
    section.unlock_month ?? 1
  );

  const [addingLesson, setAddingLesson] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] = useState("");

  const lessons = section.lessons;

  useEffect(() => {
    if (!editingTitle) setSectionTitle(section.title);
  }, [section.title, editingTitle]);

  const saveTitle = async () => {
    const title = sectionTitle.trim();
    if (!title) return;

    setSaving(true);

    try {
      await updateSection(section.id, { title });
      showToast("تم تعديل اسم القسم", "success");
      setEditingTitle(false);
      await onRefresh();
    } catch (error) {
      showToast(errorMessage(error, "تعذر تعديل القسم"), "error");
    } finally {
      setSaving(false);
    }
  };

  const saveUnlockMonth = async () => {
    const value = Math.max(1, Math.floor(Number(unlockMonth) || 1));
    setUnlockMonth(value);

    try {
      await updateSection(section.id, { unlockMonth: value });
      showToast("تم حفظ شهر فتح القسم", "success");
    } catch {
      showToast("تعذر حفظ شهر فتح القسم", "error");
    }
  };

  const addLesson = async () => {
    const title = newLessonTitle.trim();
    if (!title) return;

    setSaving(true);

    try {
      await createLesson({
        sectionId: section.id,
        title,
        description: newLessonDescription.trim(),
        orderIndex: lessons.length,
        isPreview: false,
      });

      showToast("تم إنشاء الدرس بنجاح", "success");

      setNewLessonTitle("");
      setNewLessonDescription("");
      setAddingLesson(false);

      await onRefresh();
    } catch (error) {
      showToast(errorMessage(error, "حدث خطأ أثناء إنشاء الدرس"), "error");
    } finally {
      setSaving(false);
    }
  };

  const removeSection = () => {
    if (lessons.some((lesson) => isVideoUploading(lesson.id))) {
      showToast("لا يمكن حذف القسم أثناء رفع فيديو بداخله", "error");
      return;
    }

    askConfirm({
      title: "حذف القسم",
      description: `هل أنت متأكد من حذف القسم "${section.title}"؟ سيتم حذف كل الدروس وفيديوهاتها نهائيًا.`,
      confirmLabel: "حذف القسم",
      onConfirm: async () => {
        try {
          await removeLessonFiles(lessons.map((l) => l.id));
          await deleteSection(section.id);
          showToast("تم حذف القسم بنجاح", "success");
          await onRefresh();
        } catch (error) {
          showToast(errorMessage(error, "تعذر حذف القسم"), "error");
        }
      },
    });
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-slate-600 shadow-sm transition hover:bg-slate-100"
            >
              {expanded ? (
                <ChevronUp className="h-5 w-5" />
              ) : (
                <ChevronDown className="h-5 w-5" />
              )}
            </button>

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
              <BookOpen className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              {editingTitle ? (
                <div className="flex gap-2">
                  <input
                    value={sectionTitle}
                    onChange={(e) => setSectionTitle(e.target.value)}
                    autoFocus
                    className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />

                  <button
                    type="button"
                    disabled={saving || !sectionTitle.trim()}
                    onClick={saveTitle}
                    className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
                  >
                    حفظ
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingTitle(false);
                      setSectionTitle(section.title);
                    }}
                    className="rounded-xl bg-slate-200 px-3 py-2 text-xs font-bold text-slate-700"
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-black text-slate-900">
                      {index + 1}. {section.title}
                    </h3>

                    <button
                      type="button"
                      onClick={() => setEditingTitle(true)}
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                      title="تعديل اسم القسم"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span>{lessons.length} درس</span>

                    <span className="flex items-center gap-1.5">
                      يفتح من الشهر
                      <input
                        type="number"
                        min={1}
                        value={unlockMonth}
                        onChange={(e) => setUnlockMonth(Number(e.target.value))}
                        className="w-14 rounded-lg border border-slate-200 bg-white px-2 py-1 text-center text-xs font-bold text-slate-700 outline-none focus:border-brand-500"
                      />
                      <button
                        type="button"
                        onClick={saveUnlockMonth}
                        className="rounded-lg bg-brand-50 px-2 py-1 font-bold text-brand-700 transition hover:bg-brand-100"
                      >
                        حفظ
                      </button>
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setExpanded(true);
                setAddingLesson(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              إضافة درس
            </button>

            <button
              type="button"
              onClick={removeSection}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm font-bold text-red-600 transition hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
              حذف القسم
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {expanded && (
        <div className="p-4 sm:p-5">
          {addingLesson && (
            <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <h4 className="font-bold text-slate-900">إضافة درس جديد</h4>

                <button
                  type="button"
                  onClick={() => setAddingLesson(false)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4">
                <input
                  value={newLessonTitle}
                  onChange={(e) => setNewLessonTitle(e.target.value)}
                  placeholder="اسم الدرس"
                  autoFocus
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />

                <textarea
                  rows={3}
                  value={newLessonDescription}
                  onChange={(e) => setNewLessonDescription(e.target.value)}
                  placeholder="وصف مختصر للدرس (اختياري)"
                  className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                />

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setAddingLesson(false)}
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    disabled={saving || !newLessonTitle.trim()}
                    onClick={addLesson}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                    إنشاء الدرس
                  </button>
                </div>
              </div>
            </div>
          )}

          {lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-10 text-center">
              <PlayCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <h4 className="font-bold text-slate-700">
                لا توجد دروس في هذا القسم
              </h4>
            </div>
          ) : (
            <div className="space-y-4">
              {lessons.map((lesson, i) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={i}
                  task={uploads[lesson.id]}
                  onRefresh={onRefresh}
                  askConfirm={askConfirm}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Course Content View (أقسام + دروس)                                         */
/* -------------------------------------------------------------------------- */

function CourseContentView({
  initialCourse,
  onBack,
}: {
  initialCourse: any;
  onBack: () => void;
}) {
  const { showToast } = useToast();

  const [course, setCourse] = useState<any>(initialCourse);
  const [sections, setSections] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [addingSection, setAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");
  const [creatingSection, setCreatingSection] = useState(false);

  const [editingDetails, setEditingDetails] = useState(false);
  const [savingDetails, setSavingDetails] = useState(false);
  const [form, setForm] = useState({
    title: initialCourse.title ?? "",
    description: initialCourse.description ?? "",
    price: Number(initialCourse.price ?? 0),
    published: Boolean(initialCourse.is_published),
  });

  const [confirm, setConfirm] = useState<ConfirmState>(CLOSED_CONFIRM);

  const askConfirm: AskConfirm = (options) =>
    setConfirm({ open: true, ...options });

  const uploads = useSyncExternalStore(
    subscribeVideoUploads,
    getVideoUploadsSnapshot
  );

  const load = async (full = false) => {
    if (full) {
      setLoading(true);
      setError(null);
    } else {
      setRefreshing(true);
    }

    try {
      const data = (await fetchSections(course.id)) as unknown as any[];

      const normalized: SectionItem[] = (data ?? [])
        .map((section) => ({
          ...section,
          lessons: [...(section.lessons ?? [])].sort((a: any, b: any) => {
            const diff = Number(a.order_index ?? 0) - Number(b.order_index ?? 0);
            if (diff !== 0) return diff;
            return (
              new Date(a.created_at ?? 0).getTime() -
              new Date(b.created_at ?? 0).getTime()
            );
          }),
        }))
        .sort(
          (a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0)
        );

      setSections(normalized);
      setError(null);
    } catch (err) {
      const message = errorMessage(err, "تعذّر تحميل محتوى الكورس");

      if (full) setError(message);
      else showToast(message, "error");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id]);

  // لما أي رفع فيديو يخلص بنجاح نعمل refresh مرة واحدة
  const doneUploadsKey = Object.values(uploads)
    .filter((task) => task.status === "done")
    .map((task) => task.lessonId)
    .sort()
    .join(",");

  useEffect(() => {
    if (doneUploadsKey) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doneUploadsKey]);

  const stats = useMemo(() => {
    const lessons = sections.flatMap((s) => s.lessons);

    return {
      sections: sections.length,
      lessons: lessons.length,
      videos: lessons.filter((l) => l.vdocipher_video_id).length,
      students: Number(course.students_count ?? 0),
    };
  }, [sections, course.students_count]);

  const createNewSection = async () => {
    const title = newSectionTitle.trim();
    if (!title) return;

    setCreatingSection(true);

    try {
      await createSection(course.id, title, sections.length);
      showToast("تم إنشاء القسم بنجاح", "success");
      setNewSectionTitle("");
      setAddingSection(false);
      await load();
    } catch (err) {
      showToast(errorMessage(err, "حدث خطأ أثناء إنشاء القسم"), "error");
    } finally {
      setCreatingSection(false);
    }
  };

  const saveDetails = async () => {
    const title = form.title.trim();

    if (!title) {
      showToast("عنوان الكورس مطلوب", "error");
      return;
    }

    if (!Number.isFinite(form.price) || form.price < 0) {
      showToast("السعر غير صحيح", "error");
      return;
    }

    setSavingDetails(true);

    try {
      const updates = {
        title,
        description: form.description.trim(),
        price: form.price,
        is_published: form.published,
        status: form.published ? "published" : "draft",
      };

      await updateCourse(course.id, updates as any);

      setCourse((current: any) => ({ ...current, ...updates }));
      setEditingDetails(false);
      showToast("تم حفظ بيانات الكورس", "success");
    } catch (err) {
      showToast(errorMessage(err, "تعذّر حفظ بيانات الكورس"), "error");
    } finally {
      setSavingDetails(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowRight className="h-4 w-4" />
              العودة للكورسات
            </button>

            <button
              type="button"
              onClick={() => load()}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              تحديث
            </button>
          </div>

          {editingDetails ? (
            <div className="space-y-3">
              <input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="عنوان الكورس"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />

              <textarea
                rows={3}
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="وصف الكورس"
                className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
              />

              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  السعر (ج.م)
                  <input
                    type="number"
                    min={0}
                    value={form.price}
                    onChange={(e) =>
                      setForm({ ...form, price: Number(e.target.value) })
                    }
                    className="w-32 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500"
                  />
                </label>

                <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.published}
                    onChange={(e) =>
                      setForm({ ...form, published: e.target.checked })
                    }
                    className="h-4 w-4 accent-brand-600"
                  />
                  منشور
                </label>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={saveDetails}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                >
                  {savingDetails && <Loader2 className="h-4 w-4 animate-spin" />}
                  حفظ
                </button>

                <button
                  type="button"
                  disabled={savingDetails}
                  onClick={() => {
                    setEditingDetails(false);
                    setForm({
                      title: course.title ?? "",
                      description: course.description ?? "",
                      price: Number(course.price ?? 0),
                      published: Boolean(course.is_published),
                    });
                  }}
                  className="rounded-xl bg-slate-100 px-4 py-2.5 text-sm font-bold text-slate-700"
                >
                  إلغاء
                </button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-2xl font-black text-slate-900">
                    {course.title}
                  </h1>

                  <Badge color={course.is_published ? "green" : "amber"}>
                    {course.is_published ? "منشور" : "مسودة"}
                  </Badge>
                </div>

                {course.description && (
                  <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                    {course.description}
                  </p>
                )}

                <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">
                    {course.teacher?.full_name || "معلم غير محدد"}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">
                    {COLLEGE_LABELS[course.college] || "غير محدد"}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-slate-600">
                    {formatCurrency(course.price)}
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setEditingDetails(true)}
              >
                <Pencil className="h-3.5 w-3.5" />
                تعديل بيانات الكورس
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          {
            label: "عدد الطلاب",
            value: stats.students,
            icon: <Users className="h-5 w-5" />,
            cls: "bg-sky-50 text-sky-600",
          },
          {
            label: "الأقسام",
            value: stats.sections,
            icon: <BookOpen className="h-5 w-5" />,
            cls: "bg-blue-50 text-blue-600",
          },
          {
            label: "الدروس",
            value: stats.lessons,
            icon: <PlayCircle className="h-5 w-5" />,
            cls: "bg-violet-50 text-violet-600",
          },
          {
            label: "الفيديوهات",
            value: stats.videos,
            icon: <Video className="h-5 w-5" />,
            cls: "bg-emerald-50 text-emerald-600",
          },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${item.cls}`}
              >
                {item.icon}
              </div>

              <div>
                <p className="text-xs text-slate-400">{item.label}</p>
                <p className="text-xl font-black text-slate-900">
                  {loading && item.label !== "عدد الطلاب" ? "—" : item.value}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Content header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-black text-slate-900">محتوى الكورس</h2>

        <button
          type="button"
          onClick={() => setAddingSection(true)}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          إضافة قسم
        </button>
      </div>

      {addingSection && (
        <div className="rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="font-black text-slate-900">إضافة قسم جديد</h3>

            <button
              type="button"
              onClick={() => setAddingSection(false)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              placeholder="اسم القسم"
              autoFocus
              className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
            />

            <button
              type="button"
              disabled={creatingSection || !newSectionTitle.trim()}
              onClick={createNewSection}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingSection && <Loader2 className="h-4 w-4 animate-spin" />}
              إنشاء القسم
            </button>
          </div>
        </div>
      )}

      {/* Sections */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-3xl" />
          ))}
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-red-500" />
          <p className="mt-3 text-sm text-slate-600">{error}</p>
          <Button className="mt-4" onClick={() => load(true)}>
            <RefreshCw className="h-4 w-4" />
            المحاولة مرة أخرى
          </Button>
        </Card>
      ) : sections.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
          <BookOpen className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-4 text-lg font-black text-slate-900">
            الكورس لا يحتوي على أقسام
          </h3>
          <button
            type="button"
            onClick={() => setAddingSection(true)}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            إضافة أول قسم
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {sections.map((section, index) => (
            <SectionBlock
              key={section.id}
              section={section}
              index={index}
              uploads={uploads}
              onRefresh={() => load()}
              askConfirm={askConfirm}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        description={confirm.description}
        danger
        confirmLabel={confirm.confirmLabel}
        onConfirm={async () => {
          try {
            await confirm.onConfirm();
          } finally {
            setConfirm(CLOSED_CONFIRM);
          }
        }}
        onCancel={() => setConfirm(CLOSED_CONFIRM)}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* New Activity Banner                                                        */
/* -------------------------------------------------------------------------- */

const KIND_META: Record<
  ActivityKind,
  { label: string; icon: typeof BookOpen; iconClass: string; chipClass: string }
> = {
  course: {
    label: "كورس جديد",
    icon: BookOpen,
    iconClass: "bg-brand-50 text-brand-600",
    chipClass: "bg-brand-50 text-brand-700",
  },
  section: {
    label: "قسم جديد",
    icon: Layers,
    iconClass: "bg-blue-50 text-blue-600",
    chipClass: "bg-blue-50 text-blue-700",
  },
  lesson: {
    label: "درس جديد",
    icon: PlayCircle,
    iconClass: "bg-violet-50 text-violet-600",
    chipClass: "bg-violet-50 text-violet-700",
  },
};

function NewActivityBanner({
  items,
  onDismiss,
  onOpenCourse,
}: {
  items: ActivityItem[];
  onDismiss: () => void;
  onOpenCourse: (courseId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  const counts = {
    course: items.filter((i) => i.kind === "course").length,
    section: items.filter((i) => i.kind === "section").length,
    lesson: items.filter((i) => i.kind === "lesson").length,
  };

  const visible = expanded ? items : items.slice(0, BANNER_PREVIEW_COUNT);

  return (
    <div className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-l from-brand-50 via-white to-white p-5 shadow-sm">
      <div className="absolute inset-y-0 right-0 w-1.5 bg-brand-500" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500 text-white shadow-md shadow-brand-500/30">
            <Bell className="h-5 w-5" />
            <span className="absolute -left-1 -top-1 flex h-3.5 w-3.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
            </span>
          </div>

          <div className="min-w-0">
            <h2 className="text-base font-extrabold text-slate-900">
              إضافات جديدة على الكورسات
            </h2>

            <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
              {counts.course > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 ${KIND_META.course.chipClass}`}
                >
                  {counts.course} كورس
                </span>
              )}
              {counts.section > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 ${KIND_META.section.chipClass}`}
                >
                  {counts.section} قسم
                </span>
              )}
              {counts.lesson > 0 && (
                <span
                  className={`rounded-full px-2 py-0.5 ${KIND_META.lesson.chipClass}`}
                >
                  {counts.lesson} درس
                </span>
              )}
              <span className="text-slate-400">
                آخر {NEW_WINDOW_HOURS} ساعة — الأحدث أولاً
              </span>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onDismiss}
          className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-800"
        >
          <X className="h-3.5 w-3.5" />
          تم الاطلاع
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {visible.map((item) => {
          const meta = KIND_META[item.kind];
          const Icon = meta.icon;
          const clickable = Boolean(item.courseId);

          return (
            <button
              key={item.key}
              type="button"
              disabled={!clickable}
              onClick={() => item.courseId && onOpenCourse(item.courseId)}
              className="flex w-full items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 text-right shadow-sm transition hover:border-brand-200 hover:shadow disabled:cursor-default"
            >
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.iconClass}`}
              >
                <Icon className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${meta.chipClass}`}
                  >
                    {meta.label}
                  </span>

                  <span className="truncate text-sm font-bold text-slate-800">
                    {item.kind === "course" && item.courseTitle}
                    {item.kind === "section" && item.sectionTitle}
                    {item.kind === "lesson" && item.lessonTitle}
                  </span>
                </div>

                {/* المسار: الكورس ‹ القسم ‹ الدرس */}
                <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500">
                  <BookOpen className="h-3 w-3 shrink-0 text-slate-400" />
                  <span className="max-w-[200px] truncate">
                    {item.courseTitle}
                  </span>

                  {item.kind !== "course" && item.sectionTitle && (
                    <>
                      <ChevronLeft className="h-3 w-3 shrink-0 text-slate-300" />
                      <Layers className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="max-w-[200px] truncate">
                        {item.sectionTitle}
                      </span>
                    </>
                  )}

                  {item.kind === "lesson" && item.lessonTitle && (
                    <>
                      <ChevronLeft className="h-3 w-3 shrink-0 text-slate-300" />
                      <PlayCircle className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="max-w-[200px] truncate">
                        {item.lessonTitle}
                      </span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex shrink-0 flex-col items-end gap-1.5">
                {item.kind === "lesson" && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold ${
                      item.hasVideo
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-amber-50 text-amber-700"
                    }`}
                  >
                    {item.hasVideo ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Video className="h-3 w-3" />
                    )}
                    {item.hasVideo ? "تم رفع الفيديو" : "لا يوجد فيديو بعد"}
                  </span>
                )}

                <span className="text-[11px] text-slate-400">
                  {timeAgo(item.at)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {items.length > BANNER_PREVIEW_COUNT && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-brand-700 transition hover:text-brand-800"
        >
          {expanded
            ? "عرض أقل"
            : `عرض الكل (${items.length - BANNER_PREVIEW_COUNT} إضافية)`}
          <ChevronDown
            className={`h-3.5 w-3.5 transition ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function CoursesAdminPage() {
  const { showToast } = useToast();

  const [courses, setCourses] = useState<any[]>([]);
  const [recent, setRecent] = useState<RecentContent>({
    sections: [],
    lessons: [],
  });
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<any | null>(null);
  const [search, setSearch] = useState("");

  const [lastSeen, setLastSeen] = useState<number>(() => {
    try {
      return Number(localStorage.getItem(LAST_SEEN_KEY)) || 0;
    } catch {
      return 0;
    }
  });

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);

      try {
        const since = new Date(
          Date.now() - NEW_WINDOW_HOURS * 60 * 60 * 1000
        ).toISOString();

        const [coursesData, recentData] = await Promise.all([
          fetchAllCoursesAdmin(),
          fetchRecentContent(since),
        ]);

        setCourses(coursesData);
        setRecent(recentData);
      } catch {
        if (!silent) showToast("تعذّر تحميل الكورسات", "error");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  useEffect(() => {
    load();

    // تحديث تلقائي هادي (بدون skeleton) عشان البانر يعرض حالة الفيديو الحالية
    const id = setInterval(() => {
      if (!document.hidden) load(true);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(id);
  }, [load]);

  // كل الإضافات الجديدة (كورسات + أقسام + دروس) في قائمة واحدة مرتبة
  const activity = useMemo<ActivityItem[]>(() => {
    const cutoff = Math.max(
      Date.now() - NEW_WINDOW_HOURS * 60 * 60 * 1000,
      lastSeen
    );

    const isFresh = (dateStr?: string | null) =>
      !!dateStr && new Date(dateStr).getTime() > cutoff;

    const courseTitleById = new Map<string, string>(
      courses.map((c) => [c.id, c.title])
    );

    const items: ActivityItem[] = [];

    courses.forEach((c) => {
      if (!isFresh(c.created_at)) return;

      items.push({
        key: `course-${c.id}`,
        kind: "course",
        at: c.created_at,
        courseId: c.id,
        courseTitle: c.title,
      });
    });

    recent.sections.forEach((s) => {
      if (!isFresh(s.created_at)) return;

      items.push({
        key: `section-${s.id}`,
        kind: "section",
        at: s.created_at,
        courseId: s.course_id ?? null,
        courseTitle: courseTitleById.get(s.course_id) || "كورس غير معروف",
        sectionTitle: s.title,
      });
    });

    recent.lessons.forEach((l) => {
      if (!isFresh(l.created_at)) return;

      const section = Array.isArray(l.section) ? l.section[0] : l.section;

      items.push({
        key: `lesson-${l.id}`,
        kind: "lesson",
        at: l.created_at,
        courseId: section?.course_id ?? null,
        courseTitle:
          courseTitleById.get(section?.course_id) || "كورس غير معروف",
        sectionTitle: section?.title || "قسم غير معروف",
        lessonTitle: l.title,
        hasVideo: Boolean(l.vdocipher_video_id),
      });
    });

    return items.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
    );
  }, [courses, recent, lastSeen]);

  const newCourseIds = useMemo(
    () =>
      new Set(
        activity
          .filter((i) => i.kind === "course")
          .map((i) => i.courseId as string)
      ),
    [activity]
  );

  const dismissBanner = () => {
    const now = Date.now();
    setLastSeen(now);

    try {
      localStorage.setItem(LAST_SEEN_KEY, String(now));
    } catch {
      /* ignore */
    }
  };

  const openCourseById = (courseId: string) => {
    const course = courses.find((c) => c.id === courseId);
    if (course) setSelectedCourse(course);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await adminDeleteCourse(deleteTarget.id);

      showToast("تم حذف الكورس بنجاح", "success");
      setDeleteTarget(null);

      await load();
    } catch {
      showToast("تعذّر حذف الكورس", "error");
    }
  };

  const filteredCourses = courses.filter((course) => {
    const query = search.trim().toLowerCase();

    if (!query) return true;

    return (
      course.title?.toLowerCase().includes(query) ||
      course.teacher?.full_name?.toLowerCase().includes(query) ||
      COLLEGE_LABELS[course.college]?.toLowerCase().includes(query)
    );
  });

  const publishedCount = courses.filter((c) => c.is_published).length;
  const draftCount = courses.filter((c) => !c.is_published).length;

  const totalStudents = courses.reduce(
    (sum, course) => sum + Number(course.students_count || 0),
    0
  );

  // شاشة محتوى الكورس
  if (selectedCourse) {
    return (
      <CourseContentView
        key={selectedCourse.id}
        initialCourse={selectedCourse}
        onBack={() => {
          setSelectedCourse(null);
          load();
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* New activity banner */}
      {!loading && activity.length > 0 && (
        <NewActivityBanner
          items={activity}
          onDismiss={dismissBanner}
          onOpenCourse={openCourseById}
        />
      )}

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-brand-500/10 blur-3xl" />
        <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
              <BookOpen className="h-7 w-7" />
            </div>

            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-900">
                إدارة الكورسات
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                إدارة ومتابعة جميع الكورسات، أقسامها ودروسها وفيديوهاتها
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <div className="min-w-[90px] rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-center">
              <p className="text-xl font-extrabold text-slate-900">
                {loading ? "—" : courses.length}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-slate-400">
                إجمالي الكورسات
              </p>
            </div>

            <div className="min-w-[90px] rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-xl font-extrabold text-emerald-700">
                {loading ? "—" : publishedCount}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-emerald-600">
                منشورة
              </p>
            </div>

            <div className="min-w-[90px] rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
              <p className="text-xl font-extrabold text-amber-700">
                {loading ? "—" : draftCount}
              </p>
              <p className="mt-0.5 text-[11px] font-medium text-amber-600">
                مسودات
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="relative overflow-hidden border-slate-200 p-5 shadow-sm">
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <Users className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">
                {loading ? "—" : totalStudents}
              </p>
              <p className="text-sm text-slate-500">إجمالي اشتراكات الطلاب</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 p-5 shadow-sm">
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CircleDollarSign className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">
                {loading ? "—" : courses.length}
              </p>
              <p className="text-sm text-slate-500">كورسات متاحة للإدارة</p>
            </div>
          </div>
        </Card>

        <Card className="relative overflow-hidden border-slate-200 p-5 shadow-sm sm:col-span-2 lg:col-span-1">
          <div className="relative flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
              <GraduationCap className="h-5 w-5" />
            </div>

            <div>
              <p className="text-2xl font-extrabold text-slate-900">
                {loading ? "—" : new Set(courses.map((c) => c.teacher_id)).size}
              </p>
              <p className="text-sm text-slate-500">معلمون لديهم كورسات</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Search */}
      <Card className="border-slate-200 p-3 shadow-sm">
        <div className="relative">
          <Search className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />

          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الكورس أو المعلم أو الكلية..."
            className="w-full rounded-xl border border-transparent bg-slate-50 py-3 pr-11 pl-4 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-brand-300 focus:bg-white focus:ring-4 focus:ring-brand-500/10"
          />
        </div>
      </Card>

      {/* Courses */}
      <Card className="overflow-hidden border-slate-200 p-0 shadow-sm">
        <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-extrabold text-slate-800">قائمة الكورسات</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              {loading
                ? "جاري تحميل البيانات..."
                : `${filteredCourses.length} كورس`}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-400">
            <FileStack className="h-4 w-4" />
            عرض جميع الكورسات
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={<BookOpen className="h-6 w-6" />}
              title={search ? "لا توجد نتائج" : "لا توجد كورسات بعد"}
            />
          </div>
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50/70 text-right text-xs font-bold text-slate-500">
                  <tr>
                    <th className="px-5 py-4">الكورس</th>
                    <th className="px-5 py-4">المعلم</th>
                    <th className="px-5 py-4">الكلية</th>
                    <th className="px-5 py-4">السعر</th>
                    <th className="px-5 py-4">الطلاب</th>
                    <th className="px-5 py-4">الحالة</th>
                    <th className="px-5 py-4 text-center">إجراء</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredCourses.map((c) => {
                    const isNew = newCourseIds.has(c.id);

                    return (
                      <tr
                        key={c.id}
                        className={`group transition hover:bg-slate-50/70 ${
                          isNew ? "bg-brand-50/40" : ""
                        }`}
                      >
                        <td className="px-5 py-4">
                          <button
                            type="button"
                            onClick={() => setSelectedCourse(c)}
                            className="flex items-center gap-3 text-right"
                          >
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                              <BookOpen className="h-4 w-4" />
                            </div>

                            <p className="max-w-[230px] truncate font-extrabold text-slate-800 group-hover:text-brand-600">
                              {c.title}
                            </p>

                            {isNew && (
                              <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                جديد
                              </span>
                            )}
                          </button>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                              {c.teacher?.full_name?.charAt(0) || "م"}
                            </div>

                            <span className="font-medium text-slate-600">
                              {c.teacher?.full_name || "غير محدد"}
                            </span>
                          </div>
                        </td>

                        <td className="px-5 py-4 text-slate-500">
                          {COLLEGE_LABELS[c.college] || "غير محدد"}
                        </td>

                        <td className="px-5 py-4">
                          <span className="font-bold text-slate-700">
                            {formatCurrency(c.price)}
                          </span>
                        </td>

                        <td className="px-5 py-4">
                          <div className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1.5 font-bold text-sky-700">
                            <Users className="h-4 w-4" />
                            {c.students_count || 0}
                          </div>
                        </td>

                        <td className="px-5 py-4">
                          <Badge color={c.is_published ? "green" : "amber"}>
                            {c.is_published ? "منشور" : "مسودة"}
                          </Badge>
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedCourse(c)}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                              إدارة المحتوى
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              title="حذف الكورس"
                              onClick={() => setDeleteTarget(c)}
                              className="border-red-100 hover:border-red-200 hover:bg-red-50"
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="space-y-3 p-3 md:hidden">
              {filteredCourses.map((c) => {
                const isNew = newCourseIds.has(c.id);

                return (
                  <div
                    key={c.id}
                    className={`rounded-2xl border p-4 transition hover:border-slate-200 hover:shadow-sm ${
                      isNew
                        ? "border-brand-200 bg-brand-50/40"
                        : "border-slate-100 bg-white"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                          <BookOpen className="h-5 w-5" />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="truncate font-extrabold text-slate-800">
                              {c.title}
                            </p>

                            {isNew && (
                              <span className="shrink-0 rounded-full bg-brand-500 px-2 py-0.5 text-[10px] font-bold text-white">
                                جديد
                              </span>
                            )}
                          </div>

                          <p className="mt-1 text-xs text-slate-400">
                            {c.teacher?.full_name || "معلم غير محدد"}
                          </p>
                        </div>
                      </div>

                      <Badge color={c.is_published ? "green" : "amber"}>
                        {c.is_published ? "منشور" : "مسودة"}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-3 gap-2">
                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <p className="text-[10px] text-slate-400">الكلية</p>
                        <p className="mt-1 truncate text-xs font-bold text-slate-600">
                          {COLLEGE_LABELS[c.college] || "—"}
                        </p>
                      </div>

                      <div className="rounded-xl bg-slate-50 p-2.5">
                        <p className="text-[10px] text-slate-400">السعر</p>
                        <p className="mt-1 text-xs font-bold text-slate-600">
                          {formatCurrency(c.price)}
                        </p>
                      </div>

                      <div className="rounded-xl bg-sky-50 p-2.5">
                        <p className="text-[10px] text-sky-500">الطلاب</p>
                        <p className="mt-1 text-xs font-bold text-sky-700">
                          {c.students_count || 0}
                        </p>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-3">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setSelectedCourse(c)}
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        إدارة المحتوى
                      </Button>

                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDeleteTarget(c)}
                        className="border-red-100 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        حذف
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </Card>

      {/* Delete dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف الكورس"
        description={`سيتم حذف "${deleteTarget?.title}" نهائيًا مع كل أقسامه ودروسه وفيديوهاته. هذا الإجراء لا يمكن التراجع عنه.`}
        danger
        confirmLabel="حذف نهائي"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}