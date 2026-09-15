import {
  ChangeEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Link, useParams } from "react-router-dom";

import {
  AlertCircle,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Download,
  Eye,
  File,
  FileArchive,
  FileImage,
  FilePlus2,
  FileSpreadsheet,
  FileText,
  FileVideo,
  FolderOpen,
  Loader2,
  MoreVertical,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

import { supabase } from "@/lib/supabase";

import {
  fetchCourseBySlugOrId,
  fetchSections,
  createSection,
  createLesson,
  updateLesson,
  deleteLesson,
  deleteSection,
  updateSection,
  updateLessonVideoPath,
  deleteLessonVideo,
  getVideoStoragePath,
} from "@/services/teacherCourses";

import type {
  Course,
  CourseSection,
  Lesson,
} from "@/types";

/* -------------------------------------------------------------------------- */
/* Types                                                                      */
/* -------------------------------------------------------------------------- */

interface LessonFile {
  id: string;
  lesson_id: string;
  title: string;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  order_index: number;
  created_at: string;
}

interface LessonWithFiles extends Lesson {
  files?: LessonFile[];
}

interface SectionWithLessons extends CourseSection {
  lessons?: LessonWithFiles[];
}

interface UploadState {
  uploading: boolean;
  progress: number;
  error: string | null;
  fileName: string | null;
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

const FILE_BUCKET = "course-files";

function formatFileSize(bytes: number | null | undefined) {
  if (!bytes) return "0 KB";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function getFileIcon(mimeType: string | null, fileName: string) {
  const mime = mimeType?.toLowerCase() ?? "";
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";

  if (
    mime.includes("pdf") ||
    extension === "pdf"
  ) {
    return FileText;
  }

  if (
    mime.includes("image") ||
    ["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(extension)
  ) {
    return FileImage;
  }

  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(extension)
  ) {
    return FileSpreadsheet;
  }

  if (
    mime.includes("video") ||
    ["mp4", "mov", "avi", "mkv", "webm"].includes(extension)
  ) {
    return FileVideo;
  }

  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    ["zip", "rar", "7z"].includes(extension)
  ) {
    return FileArchive;
  }

  return File;
}

function getFileTypeLabel(
  mimeType: string | null,
  fileName: string
) {
  const extension =
    fileName.split(".").pop()?.toUpperCase() || "FILE";

  if (mimeType?.includes("pdf")) return "PDF";
  if (mimeType?.includes("word")) return "Word";
  if (mimeType?.includes("excel")) return "Excel";
  if (mimeType?.includes("powerpoint")) return "PowerPoint";
  if (mimeType?.includes("image")) return "صورة";
  if (mimeType?.includes("video")) return "فيديو";

  return extension;
}

/* -------------------------------------------------------------------------- */
/* Lesson Files                                                               */
/* -------------------------------------------------------------------------- */

function LessonFilesManager({
  lesson,
  files,
  onFilesChange,
}: {
  lesson: LessonWithFiles;
  files: LessonFile[];
  onFilesChange: (
    lessonId: string,
    files: LessonFile[]
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [open, setOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingName, setUploadingName] = useState<string | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const uploadFile = async (file: globalThis.File) => {
    if (!file) return;

    setError(null);
    setUploading(true);
    setUploadProgress(0);
    setUploadingName(file.name);

    try {
      const fileId = crypto.randomUUID();

      const safeName = file.name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]/g, "-");

      const path = `${lesson.id}/${fileId}-${safeName}`;

      const { error: uploadError } = await supabase.storage
        .from(FILE_BUCKET)
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) {
        throw uploadError;
      }

      setUploadProgress(70);

      const { data, error: insertError } = await supabase
        .from("lesson_files")
        .insert({
          id: fileId,
          lesson_id: lesson.id,
          title: file.name,
          file_path: path,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type || null,
          order_index: files.length,
        })
        .select("*")
        .single();

      if (insertError) {
        await supabase.storage
          .from(FILE_BUCKET)
          .remove([path]);

        throw insertError;
      }

      setUploadProgress(100);

      onFilesChange(lesson.id, [
        ...files,
        data as LessonFile,
      ]);
    } catch (err) {
      console.error("Lesson file upload error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء رفع الملف"
      );
    } finally {
      setTimeout(() => {
        setUploading(false);
        setUploadingName(null);
        setUploadProgress(0);
      }, 500);
    }
  };

  const handleFileChange = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(
      event.target.files ?? []
    );

    if (!selectedFiles.length) return;

    for (const file of selectedFiles) {
      await uploadFile(file);
    }

    event.target.value = "";
  };

  const deleteFile = async (file: LessonFile) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف الملف "${file.file_name}"؟`
    );

    if (!confirmed) return;

    setDeletingId(file.id);
    setError(null);

    try {
      const { error: storageError } =
        await supabase.storage
          .from(FILE_BUCKET)
          .remove([file.file_path]);

      if (storageError) {
        console.warn(
          "Storage delete warning:",
          storageError
        );
      }

      const { error: dbError } = await supabase
        .from("lesson_files")
        .delete()
        .eq("id", file.id);

      if (dbError) {
        throw dbError;
      }

      onFilesChange(
        lesson.id,
        files.filter((item) => item.id !== file.id)
      );
    } catch (err) {
      console.error("Delete lesson file error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء حذف الملف"
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-right transition hover:bg-slate-100"
      >
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <FolderOpen className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <p className="font-semibold text-slate-800">
              ملفات الدرس
            </p>

            <p className="text-xs text-slate-500">
              {files.length === 0
                ? "لا توجد ملفات"
                : `${files.length} ملف`}
            </p>
          </div>
        </div>

        {open ? (
          <ChevronUp className="h-5 w-5 text-slate-400" />
        ) : (
          <ChevronDown className="h-5 w-5 text-slate-400" />
        )}
      </button>

      {open && (
        <div className="border-t border-slate-200 p-4">
          <div className="mb-4 flex flex-col gap-3 rounded-xl border border-dashed border-slate-300 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-slate-800">
                أضف ملفات مساعدة للدرس
              </p>

              <p className="mt-1 text-xs text-slate-500">
                PDF، Word، PowerPoint، صور، ملفات مضغوطة وغيرها.
              </p>
            </div>

            <button
              type="button"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <FilePlus2 className="h-4 w-4" />
              )}

              {uploading ? "جاري الرفع..." : "إضافة ملفات"}
            </button>

            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {uploading && (
            <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
              <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                <span className="truncate text-blue-800">
                  {uploadingName}
                </span>

                <span className="font-bold text-blue-700">
                  {uploadProgress}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-blue-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300"
                  style={{
                    width: `${uploadProgress}%`,
                  }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />

              <span className="flex-1">
                {error}
              </span>

              <button
                type="button"
                onClick={() => setError(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {files.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center">
              <FolderOpen className="mx-auto mb-2 h-8 w-8 text-slate-300" />

              <p className="text-sm font-medium text-slate-600">
                لا توجد ملفات لهذا الدرس
              </p>

              <p className="mt-1 text-xs text-slate-400">
                أضف الملزمة أو الملفات المساعدة من الزر بالأعلى
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => {
                const Icon = getFileIcon(
                  file.mime_type,
                  file.file_name
                );

                return (
                  <div
                    key={file.id}
                    className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Icon className="h-5 w-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-800">
                        {file.title}
                      </p>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                        <span>
                          {getFileTypeLabel(
                            file.mime_type,
                            file.file_name
                          )}
                        </span>

                        <span>•</span>

                        <span>
                          {formatFileSize(file.file_size)}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={deletingId === file.id}
                      onClick={() => deleteFile(file)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                      title="حذف الملف"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Lesson Card                                                                */
/* -------------------------------------------------------------------------- */

function LessonCard({
  lesson,
  index,
  files,
  onFilesChange,
  onRename,
  onDelete,
  onTogglePreview,
  onUploadVideo,
  onDeleteVideo,
  videoUploadState,
}: {
  lesson: LessonWithFiles;
  index: number;
  files: LessonFile[];
  onFilesChange: (
    lessonId: string,
    files: LessonFile[]
  ) => void;
  onRename: (lesson: LessonWithFiles) => void;
  onDelete: (lesson: LessonWithFiles) => void;
  onTogglePreview: (lesson: LessonWithFiles) => void;
  onUploadVideo: (lesson: LessonWithFiles) => void;
  onDeleteVideo: (lesson: LessonWithFiles) => void;
  videoUploadState?: UploadState;
}) {
  const hasVideo = Boolean(
    (lesson as Lesson & { video_path?: string | null }).video_path
  );

  const isUploading = videoUploadState?.uploading ?? false;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex min-w-0 flex-1 gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
            <span className="text-sm font-bold">
              {index + 1}
            </span>
          </div>

          <div className="min-w-0 flex-1">
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

                {hasVideo
                  ? "الفيديو مرفوع"
                  : "لا يوجد فيديو"}
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700">
                <FolderOpen className="h-3.5 w-3.5" />

                {files.length} ملفات
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 lg:justify-end">
          <button
            type="button"
            onClick={() => onRename(lesson)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <Pencil className="h-3.5 w-3.5" />
            تعديل
          </button>

          <button
            type="button"
            onClick={() => onTogglePreview(lesson)}
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              lesson.is_preview
                ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Eye className="h-3.5 w-3.5" />

            {lesson.is_preview
              ? "إلغاء المعاينة"
              : "تفعيل المعاينة"}
          </button>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => onUploadVideo(lesson)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Upload className="h-3.5 w-3.5" />
            )}

            {hasVideo ? "استبدال الفيديو" : "رفع الفيديو"}
          </button>

          {hasVideo && (
            <button
              type="button"
              disabled={isUploading}
              onClick={() => onDeleteVideo(lesson)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
              حذف الفيديو
            </button>
          )}

          <button
            type="button"
            onClick={() => onDelete(lesson)}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-600 transition hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            حذف
          </button>
        </div>
      </div>

      {isUploading && (
        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="truncate text-blue-800">
              {videoUploadState?.fileName}
            </span>

            <span className="font-bold text-blue-700">
              {videoUploadState?.progress ?? 0}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-blue-100">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${videoUploadState?.progress ?? 0}%`,
              }}
            />
          </div>
        </div>
      )}

      {videoUploadState?.error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-xs text-red-700">
          <AlertCircle className="h-4 w-4" />

          {videoUploadState.error}
        </div>
      )}

      <LessonFilesManager
        lesson={lesson}
        files={files}
        onFilesChange={onFilesChange}
      />
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Section Block                                                              */
/* -------------------------------------------------------------------------- */

function SectionBlock({
  section,
  index,
  onRefresh,
}: {
  section: SectionWithLessons;
  index: number;
  onRefresh: () => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(true);
  const [addingLesson, setAddingLesson] = useState(false);

  const [newLessonTitle, setNewLessonTitle] = useState("");
  const [newLessonDescription, setNewLessonDescription] =
    useState("");

  const [editingSection, setEditingSection] = useState(false);
  const [sectionTitle, setSectionTitle] = useState(
    section.title
  );

  const [saving, setSaving] = useState(false);

  const [localFiles, setLocalFiles] = useState<
    Record<string, LessonFile[]>
  >({});

  const [videoUploadStates, setVideoUploadStates] =
    useState<Record<string, UploadState>>({});

  const lessons = section.lessons ?? [];

  useEffect(() => {
    const loadFiles = async () => {
      if (!lessons.length) return;

      const lessonIds = lessons.map((lesson) => lesson.id);

      const { data, error } = await supabase
        .from("lesson_files")
        .select("*")
        .in("lesson_id", lessonIds)
        .order("order_index", {
          ascending: true,
        });

      if (error) {
        console.error(
          "Fetch lesson files error:",
          error
        );
        return;
      }

      const grouped: Record<string, LessonFile[]> = {};

      for (const file of (data ?? []) as LessonFile[]) {
        if (!grouped[file.lesson_id]) {
          grouped[file.lesson_id] = [];
        }

        grouped[file.lesson_id].push(file);
      }

      setLocalFiles(grouped);
    };

    loadFiles();
  }, [lessons]);

  const handleFilesChange = (
    lessonId: string,
    files: LessonFile[]
  ) => {
    setLocalFiles((current) => ({
      ...current,
      [lessonId]: files,
    }));
  };

  const addLesson = async () => {
    const title = newLessonTitle.trim();

    if (!title) return;

    setSaving(true);

    try {
      await createLesson({
        sectionId: section.id,
        title,
        description:
          newLessonDescription.trim() || "",
        orderIndex: lessons.length,
        isPreview: false,
      });

      setNewLessonTitle("");
      setNewLessonDescription("");
      setAddingLesson(false);

      await onRefresh();
    } catch (error) {
      console.error("Create lesson error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "حدث خطأ أثناء إنشاء الدرس"
      );
    } finally {
      setSaving(false);
    }
  };

  const renameLesson = async (
    lesson: LessonWithFiles
  ) => {
    const title = window.prompt(
      "اسم الدرس الجديد:",
      lesson.title
    );

    if (!title?.trim()) return;

    try {
      await updateLesson(lesson.id, {
        title: title.trim(),
      });

      await onRefresh();
    } catch (error) {
      console.error("Rename lesson error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "تعذر تعديل اسم الدرس"
      );
    }
  };

  const deleteLessonHandler = async (
    lesson: LessonWithFiles
  ) => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف "${lesson.title}"؟\nسيتم حذف الدرس وملفاته.`
    );

    if (!confirmed) return;

    try {
      const lessonFiles =
        localFiles[lesson.id] ?? [];

      if (lessonFiles.length) {
        await supabase.storage
          .from(FILE_BUCKET)
          .remove(
            lessonFiles.map(
              (file) => file.file_path
            )
          );

        await supabase
          .from("lesson_files")
          .delete()
          .eq("lesson_id", lesson.id);
      }

      await deleteLesson(lesson.id);

      await onRefresh();
    } catch (error) {
      console.error("Delete lesson error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "تعذر حذف الدرس"
      );
    }
  };

  const togglePreview = async (
    lesson: LessonWithFiles
  ) => {
    try {
      await updateLesson(lesson.id, {
        isPreview: !lesson.is_preview,
      });

      await onRefresh();
    } catch (error) {
      console.error(
        "Toggle lesson preview error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "تعذر تحديث المعاينة"
      );
    }
  };

  const uploadVideo = async (
    lesson: LessonWithFiles
  ) => {
    const input = document.createElement("input");

    input.type = "file";
    input.accept = "video/*";

    input.onchange = async () => {
      const file = input.files?.[0];

      if (!file) return;

      setVideoUploadStates((current) => ({
        ...current,
        [lesson.id]: {
          uploading: true,
          progress: 0,
          error: null,
          fileName: file.name,
        },
      }));

      try {
        const oldVideoPath = (
          lesson as Lesson & {
            video_path?: string | null;
          }
        ).video_path;

        const storagePath =
          getVideoStoragePath(
            lesson.id,
            file.name
          );

        const { error: uploadError } =
          await supabase.storage
            .from("course-videos")
            .upload(
              storagePath,
              file,
              {
                cacheControl: "3600",
                upsert: true,
                contentType:
                  file.type || "video/mp4",
              }
            );

        if (uploadError) {
          throw uploadError;
        }

        setVideoUploadStates((current) => ({
          ...current,
          [lesson.id]: {
            ...current[lesson.id],
            progress: 80,
          },
        }));

        await updateLessonVideoPath(
          lesson.id,
          storagePath
        );

        if (
          oldVideoPath &&
          oldVideoPath !== storagePath
        ) {
          await supabase.storage
            .from("course-videos")
            .remove([oldVideoPath]);
        }

        setVideoUploadStates((current) => ({
          ...current,
          [lesson.id]: {
            uploading: false,
            progress: 100,
            error: null,
            fileName: file.name,
          },
        }));

        await onRefresh();

        setTimeout(() => {
          setVideoUploadStates((current) => {
            const next = { ...current };
            delete next[lesson.id];
            return next;
          });
        }, 1000);
      } catch (error) {
        console.error(
          "Video upload error:",
          error
        );

        setVideoUploadStates((current) => ({
          ...current,
          [lesson.id]: {
            uploading: false,
            progress: 0,
            error:
              error instanceof Error
                ? error.message
                : "حدث خطأ أثناء رفع الفيديو",
            fileName: file.name,
          },
        }));
      }
    };

    input.click();
  };

  const deleteVideo = async (
    lesson: LessonWithFiles
  ) => {
    const confirmed = window.confirm(
      "هل أنت متأكد من حذف فيديو هذا الدرس؟"
    );

    if (!confirmed) return;

    try {
      const videoPath = (
        lesson as Lesson & {
          video_path?: string | null;
        }
      ).video_path;

      if (!videoPath) return;

      await deleteLessonVideo(
        lesson.id,
        videoPath
      );

      await onRefresh();
    } catch (error) {
      console.error(
        "Delete lesson video error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "تعذر حذف الفيديو"
      );
    }
  };

  const saveSectionTitle = async () => {
    const title = sectionTitle.trim();

    if (!title) return;

    setSaving(true);

    try {
      await updateSection(section.id, {
        title,
      });

      setEditingSection(false);

      await onRefresh();
    } catch (error) {
      console.error(
        "Update section error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "تعذر تعديل القسم"
      );
    } finally {
      setSaving(false);
    }
  };

  const removeSection = async () => {
    const confirmed = window.confirm(
      `هل أنت متأكد من حذف القسم "${section.title}"؟\nسيتم حذف الدروس الموجودة بداخله أيضًا.`
    );

    if (!confirmed) return;

    try {
      await deleteSection(section.id);

      await onRefresh();
    } catch (error) {
      console.error(
        "Delete section error:",
        error
      );

      alert(
        error instanceof Error
          ? error.message
          : "تعذر حذف القسم"
      );
    }
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
      {/* Section Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setExpanded((value) => !value)
              }
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
              {editingSection ? (
                <div className="flex gap-2">
                  <input
                    value={sectionTitle}
                    onChange={(event) =>
                      setSectionTitle(
                        event.target.value
                      )
                    }
                    className="min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                    autoFocus
                  />

                  <button
                    type="button"
                    disabled={saving}
                    onClick={saveSectionTitle}
                    className="rounded-xl bg-brand-600 px-3 py-2 text-xs font-bold text-white"
                  >
                    حفظ
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingSection(false);
                      setSectionTitle(
                        section.title
                      );
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
                      onClick={() =>
                        setEditingSection(true)
                      }
                      className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-slate-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <p className="mt-1 text-xs text-slate-500">
                    {lessons.length} درس
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setAddingLesson(true)
              }
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

      {expanded && (
        <div className="p-4 sm:p-5">
          {/* Add lesson */}
          {addingLesson && (
            <div className="mb-5 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-900">
                    إضافة درس جديد
                  </h4>

                  <p className="mt-1 text-xs text-slate-500">
                    أضف عنوان ووصف الدرس ثم ارفع الفيديو والملفات.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAddingLesson(false)
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-white hover:text-slate-700"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="grid gap-4">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    اسم الدرس
                  </label>

                  <input
                    value={newLessonTitle}
                    onChange={(event) =>
                      setNewLessonTitle(
                        event.target.value
                      )
                    }
                    placeholder="مثال: مقدمة في التشريح"
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    وصف الدرس
                  </label>

                  <textarea
                    rows={3}
                    value={newLessonDescription}
                    onChange={(event) =>
                      setNewLessonDescription(
                        event.target.value
                      )
                    }
                    placeholder="اكتب وصفًا مختصرًا للدرس..."
                    className="w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setAddingLesson(false)
                    }
                    className="rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    إلغاء
                  </button>

                  <button
                    type="button"
                    disabled={
                      saving ||
                      !newLessonTitle.trim()
                    }
                    onClick={addLesson}
                    className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving && (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    )}

                    إنشاء الدرس
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Lessons */}
          {lessons.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 px-4 py-12 text-center">
              <PlayCircle className="mx-auto mb-3 h-10 w-10 text-slate-300" />

              <h4 className="font-bold text-slate-700">
                لا توجد دروس في هذا القسم
              </h4>

              <p className="mt-1 text-sm text-slate-400">
                ابدأ بإضافة أول درس للقسم.
              </p>

              <button
                type="button"
                onClick={() =>
                  setAddingLesson(true)
                }
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                إضافة أول درس
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Lessons title */}
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <PlayCircle className="h-4 w-4" />
                </div>

                <div>
                  <h4 className="font-black text-slate-900">
                    الدروس
                  </h4>

                  <p className="text-xs text-slate-400">
                    فيديوهات ومحتوى الدروس
                  </p>
                </div>
              </div>

              {lessons.map((lesson, lessonIndex) => (
                <LessonCard
                  key={lesson.id}
                  lesson={lesson}
                  index={lessonIndex}
                  files={
                    localFiles[lesson.id] ?? []
                  }
                  onFilesChange={
                    handleFilesChange
                  }
                  onRename={renameLesson}
                  onDelete={
                    deleteLessonHandler
                  }
                  onTogglePreview={
                    togglePreview
                  }
                  onUploadVideo={uploadVideo}
                  onDeleteVideo={deleteVideo}
                  videoUploadState={
                    videoUploadStates[
                      lesson.id
                    ]
                  }
                />
              ))}

              {/* Assignments */}
              <div className="mt-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                      <ClipboardList className="h-5 w-5" />
                    </div>

                    <div>
                      <h4 className="font-black text-slate-900">
                        الواجبات
                      </h4>

                      <p className="mt-1 text-xs text-slate-500">
                        إدارة واجبات واختبارات هذا الكورس
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/app/teacher/courses/${section.course_id}/quiz-builder`}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-violet-700"
                  >
                    <ClipboardList className="h-4 w-4" />
                    إدارة الواجبات والاختبارات
                    <ArrowLeft className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function CourseBuilderPage() {
  const { courseId } = useParams<{
    courseId: string;
  }>();

  const [course, setCourse] =
    useState<Course | null>(null);

  const [sections, setSections] = useState<
    SectionWithLessons[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(
    null
  );

  const [addingSection, setAddingSection] =
    useState(false);

  const [sectionTitle, setSectionTitle] =
    useState("");

  const [creatingSection, setCreatingSection] =
    useState(false);

  const loadData = async (
    showFullLoader = false
  ) => {
    if (!courseId) return;

    if (showFullLoader) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const loadedCourse =
        await fetchCourseBySlugOrId(courseId);

      if (!loadedCourse) {
        throw new Error(
          "لم يتم العثور على الكورس"
        );
      }

      setCourse(loadedCourse);

      const loadedSections =
        await fetchSections(loadedCourse.id);

      setSections(
        (loadedSections ?? []) as SectionWithLessons[]
      );
    } catch (err) {
      console.error(
        "Course builder loading error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء تحميل الكورس"
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(true);
  }, [courseId]);

  const createNewSection = async () => {
    const title = sectionTitle.trim();

    if (!title || !course) return;

    setCreatingSection(true);

    try {
      await createSection(
        course.id,
        title,
        sections.length
      );

      setSectionTitle("");
      setAddingSection(false);

      await loadData();
    } catch (err) {
      console.error(
        "Create section error:",
        err
      );

      alert(
        err instanceof Error
          ? err.message
          : "حدث خطأ أثناء إنشاء القسم"
      );
    } finally {
      setCreatingSection(false);
    }
  };

  const stats = useMemo(() => {
    const lessons = sections.flatMap(
      (section) => section.lessons ?? []
    );

    const videos = lessons.filter(
      (lesson) =>
        Boolean(
          (
            lesson as Lesson & {
              video_path?: string | null;
            }
          ).video_path
        )
    ).length;

    const previews = lessons.filter(
      (lesson) => lesson.is_preview
    ).length;

    return {
      sections: sections.length,
      lessons: lessons.length,
      videos,
      previews,
    };
  }, [sections]);

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4 sm:p-6"
      >
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-32 rounded-3xl bg-slate-200" />

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map(
              (_, index) => (
                <div
                  key={index}
                  className="h-24 rounded-2xl bg-slate-200"
                />
              )
            )}
          </div>

          <div className="h-96 rounded-3xl bg-slate-200" />
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 p-5"
      >
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-xl font-black text-slate-900">
            تعذر تحميل الكورس
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            {error ?? "حدث خطأ غير معروف"}
          </p>

          <button
            type="button"
            onClick={() => loadData(true)}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
          >
            <RefreshCw className="h-4 w-4" />
            المحاولة مرة أخرى
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50"
    >
      <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="overflow-hidden rounded-3xl bg-slate-950 text-white shadow-xl">
          <div className="relative p-5 sm:p-7 lg:p-8">
            <div className="absolute -left-20 -top-20 h-64 w-64 rounded-full bg-brand-500/10 blur-3xl" />

            <div className="relative">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Link
                  to="/app/teacher/courses"
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="h-4 w-4" />
                  العودة للكورسات
                </Link>

                <button
                  type="button"
                  onClick={() => loadData()}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                >
                  <RefreshCw
                    className={`h-4 w-4 ${
                      refreshing
                        ? "animate-spin"
                        : ""
                    }`}
                  />

                  تحديث
                </button>
              </div>

              <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div className="min-w-0">


                  <h1 className="truncate text-2xl font-black sm:text-3xl lg:text-4xl">
                    {course.title}
                  </h1>

                  {course.description && (
                    <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-400">
                      {course.description}
                    </p>
                  )}
                </div>

                <Link
                  to={`/app/teacher/courses/${course.id}/quiz-builder`}
                  className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:bg-slate-100"
                >
                  <ClipboardList className="h-4 w-4" />
                  الواجبات والاختبارات
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <BookOpen className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  الأقسام
                </p>

                <p className="text-xl font-black text-slate-900">
                  {stats.sections}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                <PlayCircle className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  الدروس
                </p>

                <p className="text-xl font-black text-slate-900">
                  {stats.lessons}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Video className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  الفيديوهات
                </p>

                <p className="text-xl font-black text-slate-900">
                  {stats.videos}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <Eye className="h-5 w-5" />
              </div>

              <div>
                <p className="text-xs text-slate-400">
                  معاينات مجانية
                </p>

                <p className="text-xl font-black text-slate-900">
                  {stats.previews}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main */}
        <div className="mt-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                محتوى الكورس
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                نظم الكورس إلى أقسام ودروس، وأضف الملفات لكل درس مباشرة.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                setAddingSection(true)
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-700"
            >
              <Plus className="h-4 w-4" />
              إضافة قسم
            </button>
          </div>

          {/* Add Section */}
          {addingSection && (
            <div className="mb-5 rounded-2xl border border-brand-100 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-slate-900">
                    إضافة قسم جديد
                  </h3>

                  <p className="mt-1 text-xs text-slate-500">
                    مثال: الوحدة الأولى — أساسيات التشريح
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setAddingSection(false)
                  }
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  value={sectionTitle}
                  onChange={(event) =>
                    setSectionTitle(
                      event.target.value
                    )
                  }
                  placeholder="اسم القسم"
                  className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10"
                  autoFocus
                />

                <button
                  type="button"
                  disabled={
                    creatingSection ||
                    !sectionTitle.trim()
                  }
                  onClick={createNewSection}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingSection && (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  )}

                  إنشاء القسم
                </button>
              </div>
            </div>
          )}

          {/* Sections */}
          {sections.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <BookOpen className="h-8 w-8" />
              </div>

              <h3 className="mt-5 text-lg font-black text-slate-900">
                الكورس لا يحتوي على أقسام
              </h3>

              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">
                ابدأ بإضافة قسم، وبعدها يمكنك إضافة الدروس والفيديوهات والملفات والواجبات.
              </p>

              <button
                type="button"
                onClick={() =>
                  setAddingSection(true)
                }
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-bold text-white"
              >
                <Plus className="h-4 w-4" />
                إضافة أول قسم
              </button>
            </div>
          ) : (
            <div className="space-y-5">
              {sections.map(
                (section, index) => (
                  <SectionBlock
                    key={section.id}
                    section={section}
                    index={index}
                    onRefresh={() =>
                      loadData()
                    }
                  />
                )
              )}
            </div>
          )}
        </div>

        {/* Structure hint */}
        <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <FolderOpen className="h-5 w-5" />
            </div>

            <div>
              <h3 className="font-black text-slate-900">
                تنظيم المحتوى الجديد
              </h3>

              <p className="mt-1 text-sm leading-7 text-slate-500">
                كل درس أصبح له مساحة مستقلة لملفات الدرس، بحيث يستطيع الطالب الوصول إلى الملزمة والملفات المساعدة مباشرة بعد مشاهدة الدرس، بدل وضع كل الملفات في مكان واحد داخل الكورس.
              </p>

              <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-lg bg-blue-50 px-3 py-2 text-blue-700">
                  🎥 الدروس
                </span>

                <span className="rounded-lg bg-amber-50 px-3 py-2 text-amber-700">
                  📁 ملفات كل درس
                </span>

                <span className="rounded-lg bg-violet-50 px-3 py-2 text-violet-700">
                  📝 الواجبات
                </span>

                <span className="rounded-lg bg-emerald-50 px-3 py-2 text-emerald-700">
                  🧪 الاختبارات
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}