import { useEffect, useMemo, useRef, useState } from "react";
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
  CircleAlert,
  XCircle,
  RotateCcw,
  FileVideo2,
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
  updateLessonDescription,
  updateLessonVideoPath,
  deleteLessonVideo,
  setPreview,
} from "@/services/teacherCourses";
import { supabase } from "@/lib/supabase";

import { fetchCourseBySlugOrId } from "@/services/coursesById";
import type { Course, CourseSection, Lesson } from "@/types";
import { formatDuration } from "@/utils/format";

// ---------------------------------------------------------------------------
// Upload helper — talks to the Supabase Storage REST endpoint directly via
// XMLHttpRequest (instead of supabase-js, which exposes no progress events)
// so we get real progress, the ability to cancel mid-flight, and a hook for
// auto-retry on network drops.
// ---------------------------------------------------------------------------

const MAX_AUTO_RETRIES = 3;
const RETRY_DELAY_MS = 2000;

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
const VIDEO_BUCKET = "course-videos";

const ALLOWED_VIDEO_EXTENSIONS = ["mp4", "webm", "mov", "m4v"];

type UploadStatus = "idle" | "uploading" | "retrying" | "success" | "error" | "cancelled";

interface UploadState {
  lessonId: string;
  progress: number;
  status: UploadStatus;
  attempt: number;
  error?: string;
}

function getVideoStoragePath(courseId: string, lessonId: string, file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (!ext || !ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
    throw new Error("unsupported_format");
  }

  return `${courseId}/${lessonId}.${ext}`;
}

function uploadVideoXHR(
  courseId: string,
  lessonId: string,
  file: File,
  accessToken: string,
  onProgress: (percent: number) => void,
  xhrRef: { current: XMLHttpRequest | null }
): Promise<void> {
  return new Promise((resolve, reject) => {
    let path: string;

    try {
      path = getVideoStoragePath(courseId, lessonId, file);
    } catch {
      reject(new Error("unsupported_format"));
      return;
    }

    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;

    // Upserts directly to the Supabase Storage object endpoint.
    xhr.open(
      "PUT",
      `${SUPABASE_URL}/storage/v1/object/${VIDEO_BUCKET}/${encodeURI(path)}`
    );

    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", SUPABASE_ANON_KEY);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("cache-control", "3600");

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = async () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          // Link the uploaded file to the lesson row, same as the old flow.
          await updateLessonVideoPath(lessonId, path);
          resolve();
        } catch (linkErr) {
          reject(linkErr instanceof Error ? linkErr : new Error("link_failed"));
        }
      } else {
        reject(new Error(`status_${xhr.status}`));
      }
    };

    xhr.onerror = () => reject(new Error("network_error"));
    xhr.onabort = () => reject(new Error("aborted"));
    xhr.ontimeout = () => reject(new Error("timeout"));

    xhr.timeout = 0; // no artificial timeout for large files
    xhr.send(file);
  });
}

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
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const cancelledRef = useRef(false);

  const [deleteVideoTarget, setDeleteVideoTarget] = useState<Lesson | null>(null);
  const [deletingVideo, setDeletingVideo] = useState(false);

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
      await createSection(courseId, newSectionTitle.trim(), sections.length);

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

    const section = sections.find((s) => s.id === lessonModalSection);

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

  // -------------------------------------------------------------------------
  // Upload flow: tracks progress, retries automatically on network drops
  // (up to MAX_AUTO_RETRIES), and lets the teacher cancel or manually retry.
  // -------------------------------------------------------------------------

  const runUpload = async (file: File, attempt: number) => {
    if (!uploadTarget || !course) return;

    cancelledRef.current = false;

    setUploadState({
      lessonId: uploadTarget.id,
      progress: 0,
      status: attempt > 1 ? "retrying" : "uploading",
      attempt,
    });

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("not_authenticated");
      }

      await uploadVideoXHR(
        course.id,
        uploadTarget.id,
        file,
        accessToken,
        (percent) => {
          setUploadState((prev) =>
            prev ? { ...prev, progress: percent, status: "uploading" } : prev
          );
        },
        xhrRef
      );

      setUploadState((prev) => (prev ? { ...prev, status: "success", progress: 100 } : prev));

      showToast("تم رفع الفيديو بنجاح", "success");

      setTimeout(() => {
        setUploadTarget(null);
        setUploadState(null);
      }, 800);

      load();
    } catch (err) {
      const reason = err instanceof Error ? err.message : "unknown";

      if (cancelledRef.current || reason === "aborted") {
        setUploadState((prev) => (prev ? { ...prev, status: "cancelled" } : prev));
        return;
      }

      console.error("Upload lesson video failed:", err);

      const isNetworkIssue = reason === "network_error" || reason === "timeout";

      if (isNetworkIssue && attempt < MAX_AUTO_RETRIES) {
        showToast(
          `انقطع الاتصال، جاري إعادة المحاولة (${attempt}/${MAX_AUTO_RETRIES})...`,
          "error"
        );

        setTimeout(() => {
          if (!cancelledRef.current) runUpload(file, attempt + 1);
        }, RETRY_DELAY_MS);

        return;
      }

      let errorMessage = "تعذّر رفع الفيديو، تأكد من حجم الملف والصيغة";

      if (isNetworkIssue) {
        errorMessage = "تعذّر الاتصال بالسيرفر بعد عدة محاولات";
      } else if (reason === "unsupported_format") {
        errorMessage = "صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV";
      } else if (reason === "not_authenticated") {
        errorMessage = "انتهت الجلسة، أعد تسجيل الدخول وحاول مرة أخرى";
      } else if (reason === "link_failed") {
        errorMessage = "تم رفع الفيديو لكن تعذر ربطه بالدرس";
      }

      setUploadState((prev) =>
        prev ? { ...prev, status: "error", error: errorMessage } : prev
      );

      showToast("تعذّر رفع الفيديو", "error");
    }
  };

  const startUpload = (file: File) => {
    if (!file.type.startsWith("video/")) {
      showToast("الملف المختار ليس فيديو صالح", "error");
      return;
    }

    runUpload(file, 1);
  };

  const cancelUpload = () => {
    cancelledRef.current = true;
    xhrRef.current?.abort();
    setUploadState(null);
  };

  const closeUploadModal = () => {
    if (uploadState?.status === "uploading" || uploadState?.status === "retrying") {
      cancelUpload();
    }
    setUploadTarget(null);
    setUploadState(null);
  };

  const handleDeleteVideo = async () => {
    if (!deleteVideoTarget?.video_path) return;

    setDeletingVideo(true);

    try {
      await deleteLessonVideo(deleteVideoTarget.id, deleteVideoTarget.video_path);
      showToast("تم حذف الفيديو بنجاح", "success");
      setDeleteVideoTarget(null);
      load();
    } catch (err) {
      console.error("Delete lesson video failed:", err);
      showToast(err instanceof Error ? err.message : "تعذّر حذف الفيديو", "error");
    } finally {
      setDeletingVideo(false);
    }
  };

  const stats = useMemo(() => {
    const lessons = sections.flatMap((section) => section.lessons ?? []);

    const totalLessons = lessons.length;

    const videos = lessons.filter((lesson) => !!lesson.video_path).length;

    const previews = lessons.filter((lesson) => lesson.is_preview).length;

    const completion = totalLessons > 0 ? Math.round((videos / totalLessons) * 100) : 0;

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
            <Skeleton key={i} className="h-28 rounded-2xl" />
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
                <h1 className="text-2xl font-black">{course.title}</h1>

                <p className="mt-1 text-sm text-white/60">إدارة محتوى الكورس</p>
              </div>
            </div>
          </div>

          <Link to={`/app/teacher/courses/${course.id}/quiz-builder`}>
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
                <h2 className="font-bold text-slate-800">جاهزية محتوى الكورس</h2>
              </div>

              <p className="mt-1 text-xs text-slate-400">
                أضف فيديوهات لجميع الدروس قبل نشر الكورس
              </p>
            </div>

            <span className="text-lg font-black text-brand-600">{stats.completion}%</span>
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
          <h2 className="font-bold text-brand-900">إضافة قسم جديد</h2>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="مثال: الوحدة الأولى - Anatomy"
            value={newSectionTitle}
            onChange={(e) => setNewSectionTitle(e.target.value)}
          />

          <Button onClick={handleAddSection} className="sm:min-w-[130px]">
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

            <h3 className="mt-4 font-bold text-slate-800">لا توجد أقسام حتى الآن</h3>

            <p className="mt-1 text-sm text-slate-400">ابدأ بإضافة أول قسم للكورس</p>
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
                onAddLesson={() => setLessonModalSection(section.id)}
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
                onRenameLessonDescription={async (lessonId, newDescription) => {
                  await updateLessonDescription(lessonId, newDescription);
                  showToast("تم تعديل وصف الدرس", "success");
                  load();
                }}
                onTogglePreview={async (lesson) => {
                  await setPreview(lesson.id, !lesson.is_preview);

                  showToast(
                    lesson.is_preview ? "تم إلغاء المعاينة المجانية" : "تم تفعيل المعاينة المجانية",
                    "success"
                  );

                  load();
                }}
                onUploadClick={setUploadTarget}
                onDeleteVideoClick={setDeleteVideoTarget}
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
            onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-slate-700">وصف مختصر</label>

            <textarea
              rows={3}
              placeholder="اكتب وصفًا مختصرًا للدرس..."
              className="w-full rounded-xl border border-slate-300 px-4 py-2.5 text-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
              value={lessonForm.description}
              onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-4">
            <input
              type="checkbox"
              checked={lessonForm.isPreview}
              onChange={(e) => setLessonForm({ ...lessonForm, isPreview: e.target.checked })}
              className="h-4 w-4 accent-brand-500"
            />

            <div>
              <p className="text-sm font-bold text-slate-700">معاينة مجانية</p>

              <p className="text-xs text-slate-400">
                السماح للزائر بمشاهدة هذا الدرس قبل الاشتراك
              </p>
            </div>
          </label>

          <Button className="w-full" onClick={handleAddLesson}>
            <Plus className="h-4 w-4" />
            إضافة الدرس
          </Button>
        </div>
      </Modal>

      {/* Upload Modal */}
      <Modal
        open={!!uploadTarget}
        onClose={closeUploadModal}
        title={`رفع فيديو: ${uploadTarget?.title ?? ""}`}
      >
        <UploadPanel state={uploadState} onSelectFile={startUpload} onCancel={cancelUpload} />
      </Modal>

      {/* Delete Video Confirmation */}
      <Modal
        open={!!deleteVideoTarget}
        onClose={() => !deletingVideo && setDeleteVideoTarget(null)}
        title="حذف الفيديو"
      >
        <div className="space-y-4">
          <div className="rounded-2xl border border-red-100 bg-red-50/60 p-4 text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <Trash2 className="h-6 w-6 text-red-500" />
            </div>

            <p className="text-sm font-bold text-red-600">
              هل أنت متأكد من حذف فيديو الدرس "{deleteVideoTarget?.title}"؟
            </p>

            <p className="mt-1 text-xs text-red-400">
              سيتم حذف الفيديو نهائيًا، ويمكنك رفع فيديو جديد بعد ذلك في أي وقت.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setDeleteVideoTarget(null)}
              disabled={deletingVideo}
            >
              إلغاء
            </Button>

            <Button
              className="flex-1 bg-red-500 hover:bg-red-600"
              onClick={handleDeleteVideo}
              isLoading={deletingVideo}
            >
              <Trash2 className="h-4 w-4" />
              حذف الفيديو
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Upload panel: drag & drop + file picker + progress bar + cancel/retry UI
// ---------------------------------------------------------------------------

function UploadPanel({
  state,
  onSelectFile,
  onCancel,
}: {
  state: UploadState | null;
  onSelectFile: (file: File) => void;
  onCancel: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const isBusy = state?.status === "uploading" || state?.status === "retrying";

  const handleFile = (file: File) => {
    setPendingFile(file);
    onSelectFile(file);
  };

  if (isBusy && state) {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-brand-100 bg-brand-50/50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-brand-200 border-t-brand-500" />
          </div>

          <p className="font-bold text-brand-700">
            {state.status === "retrying"
              ? `إعادة المحاولة (${state.attempt}/${MAX_AUTO_RETRIES})...`
              : "جاري رفع الفيديو..."}
          </p>

          <p className="mt-1 text-xs text-brand-400">لا تغلق الصفحة حتى يكتمل الرفع</p>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-white">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${state.progress}%` }}
              transition={{ duration: 0.2 }}
              className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-500"
            />
          </div>

          <p className="mt-2 text-sm font-black text-brand-600">{state.progress}%</p>
        </div>

        <Button variant="outline" className="w-full" onClick={onCancel}>
          <XCircle className="h-4 w-4 text-red-500" />
          إلغاء الرفع
        </Button>
      </div>
    );
  }

  if (state?.status === "error") {
    return (
      <div className="space-y-4">
        <div className="rounded-3xl border border-red-100 bg-red-50/60 p-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
            <CircleAlert className="h-7 w-7 text-red-500" />
          </div>

          <p className="font-bold text-red-600">فشل رفع الفيديو</p>
          <p className="mt-1 text-xs text-red-400">{state.error}</p>
        </div>

        <Button
          className="w-full"
          onClick={() => pendingFile && handleFile(pendingFile)}
          disabled={!pendingFile}
        >
          <RotateCcw className="h-4 w-4" />
          إعادة المحاولة
        </Button>
      </div>
    );
  }

  if (state?.status === "success") {
    return (
      <div className="rounded-3xl border border-emerald-100 bg-emerald-50/60 p-6 text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm">
          <CheckCircle2 className="h-7 w-7 text-emerald-500" />
        </div>

        <p className="font-bold text-emerald-600">تم رفع الفيديو بنجاح</p>
      </div>
    );
  }

  // idle / cancelled — show the picker
  return (
    <label
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
      }}
      className={`group flex cursor-pointer flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed p-10 text-center transition ${
        dragOver
          ? "border-brand-400 bg-brand-50"
          : "border-slate-200 bg-slate-50/50 hover:border-brand-300 hover:bg-brand-50/40"
      }`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500 transition group-hover:scale-110">
        <UploadCloud className="h-7 w-7" />
      </div>

      <div>
        <p className="font-bold text-slate-700">اسحب الفيديو هنا أو اضغط للاختيار</p>

        <p className="mt-1 text-xs text-slate-400">MP4 / WebM / MOV</p>

        {state?.status === "cancelled" && (
          <p className="mt-1 text-xs font-semibold text-amber-500">تم إلغاء الرفع السابق</p>
        )}
      </div>

      <input
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </label>
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
    <motion.div whileHover={{ y: -3 }} className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{title}</p>

          <p className="mt-2 text-2xl font-black text-slate-800">{value}</p>

          <p className="mt-1 text-[11px] text-slate-400">{description}</p>
        </div>

        <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${iconClass}`}>
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
  onRenameLessonDescription,
  onTogglePreview,
  onUploadClick,
  onDeleteVideoClick,
}: {
  section: CourseSection;
  onAddLesson: () => void;
  onDeleteSection: () => void;
  onRenameSection: (newTitle: string) => Promise<void>;
  onDeleteLesson: (lessonId: string) => void;
  onRenameLesson: (lessonId: string, newTitle: string) => Promise<void>;
  onRenameLessonDescription: (lessonId: string, newDescription: string) => Promise<void>;
  onTogglePreview: (lesson: Lesson) => void;
  onUploadClick: (lesson: Lesson) => void;
  onDeleteVideoClick: (lesson: Lesson) => void;
}) {
  const [open, setOpen] = useState(true);
  const [editingSection, setEditingSection] = useState(false);
  const [sectionTitleDraft, setSectionTitleDraft] = useState(section.title);
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null);
  const [lessonTitleDraft, setLessonTitleDraft] = useState("");
  const [editingDescId, setEditingDescId] = useState<string | null>(null);
  const [lessonDescDraft, setLessonDescDraft] = useState("");

  const lessons = section.lessons ?? [];
  const lessonCount = lessons.length;

  const withVideo = lessons.filter((lesson) => !!lesson.video_path).length;

  const previews = lessons.filter((lesson) => lesson.is_preview).length;

  const completion = lessonCount > 0 ? Math.round((withVideo / lessonCount) * 100) : 0;

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

  const startEditingDesc = (lesson: Lesson) => {
    setEditingDescId(lesson.id);
    setLessonDescDraft(lesson.description ?? "");
  };

  const saveLessonDesc = async (lesson: Lesson) => {
    const trimmed = lessonDescDraft.trim();

    if (trimmed === (lesson.description ?? "").trim()) {
      setEditingDescId(null);
      return;
    }

    await onRenameLessonDescription(lesson.id, trimmed);
    setEditingDescId(null);
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
              <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
            </button>

            <div className="min-w-0 flex-1">
              {editingSection ? (
                <div className="flex items-center gap-2">
                  <input
                    autoFocus
                    value={sectionTitleDraft}
                    onChange={(e) => setSectionTitleDraft(e.target.value)}
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
            <Button size="sm" variant="secondary" onClick={onAddLesson}>
              <Plus className="h-3.5 w-3.5" />
              إضافة درس
            </Button>

            <Button size="sm" variant="outline" onClick={onDeleteSection}>
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

                <p className="mt-3 text-sm font-semibold text-slate-500">لا توجد دروس في هذا القسم</p>

                <button onClick={onAddLesson} className="mt-2 text-xs font-bold text-brand-500 hover:underline">
                  + أضف أول درس
                </button>
              </div>
            ) : (
              lessons.map((lesson, index) => (
                <div
                  key={lesson.id}
                  className="group flex flex-col gap-3 border-b border-slate-50 px-5 py-4 last:border-0 hover:bg-slate-50/70 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xs font-black text-slate-400">
                      {index + 1}
                    </div>

                    <div className="min-w-0 flex-1">
                      {editingLessonId === lesson.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            autoFocus
                            value={lessonTitleDraft}
                            onChange={(e) => setLessonTitleDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") saveLessonTitle(lesson);
                              if (e.key === "Escape") setEditingLessonId(null);
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
                              {formatDuration(lesson.duration_seconds)}
                            </span>
                          )}
                        </div>
                      )}

                      {editingLessonId !== lesson.id && (
                        <div className="mt-1 flex items-center gap-1.5">
                          {lesson.video_path ? (
                            <>
                              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                              <span className="text-[11px] font-medium text-emerald-600">الفيديو جاهز</span>
                            </>
                          ) : (
                            <>
                              <CircleAlert className="h-3 w-3 text-amber-500" />
                              <span className="text-[11px] font-medium text-amber-600">يحتاج فيديو</span>
                            </>
                          )}
                        </div>
                      )}

                      {/* Description */}
                      {editingDescId === lesson.id ? (
                        <div className="mt-2 flex flex-col gap-2">
                          <textarea
                            autoFocus
                            rows={2}
                            value={lessonDescDraft}
                            onChange={(e) => setLessonDescDraft(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Escape") setEditingDescId(null);
                            }}
                            placeholder="وصف مختصر للدرس..."
                            className="w-full rounded-lg border border-brand-300 px-2.5 py-1.5 text-xs text-slate-600 outline-none focus:ring-2 focus:ring-brand-500/20"
                          />

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => saveLessonDesc(lesson)}
                              className="rounded-lg bg-brand-500 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-brand-600"
                            >
                              حفظ
                            </button>

                            <button
                              onClick={() => setEditingDescId(null)}
                              className="rounded-lg px-2 py-1 text-[11px] text-slate-400 hover:text-slate-600"
                            >
                              إلغاء
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p
                          className="mt-1.5 max-w-md cursor-pointer truncate text-[11px] text-slate-400 hover:text-brand-500"
                          onClick={() => startEditingDesc(lesson)}
                          title="اضغط لتعديل الوصف"
                        >
                          {lesson.description?.trim() ? lesson.description : "+ أضف وصفًا للدرس"}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <button
                      onClick={() => onTogglePreview(lesson)}
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
                      onClick={() => onUploadClick(lesson)}
                      className="rounded-xl p-2 text-slate-400 transition hover:bg-white hover:text-brand-500 hover:shadow-sm"
                      title={lesson.video_path ? "استبدال الفيديو" : "رفع فيديو"}
                    >
                      <UploadCloud className="h-4 w-4" />
                    </button>

                    {lesson.video_path && (
                      <button
                        onClick={() => onDeleteVideoClick(lesson)}
                        className="rounded-xl p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 hover:shadow-sm"
                        title="حذف الفيديو"
                      >
                        <FileVideo2 className="h-4 w-4" />
                      </button>
                    )}

                    <button
                      onClick={() => onDeleteLesson(lesson.id)}
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