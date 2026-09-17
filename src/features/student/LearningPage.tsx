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
  PanelRightClose,
  PanelRightOpen,
  ClipboardList,
  ListVideo,
  Download,
  Trash2,
  Wifi,
  WifiOff,
  FileText,
  FileImage,
  FileSpreadsheet,
  FileArchive,
  FileVideo,
  File,
  FolderOpen,
  ExternalLink,
  PlayCircle,
  BookOpen,
  Lock,
  ArrowRight,
  ArrowLeft,
  Loader2,
  AlertCircle,
  Trophy,
  Clock3,
} from "lucide-react";

import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { VideoWatermark } from "@/components/video/VideoWatermark";
import { useScreenRecordingGuard } from "@/hooks/useScreenRecordingGuard";
import { getLessonPlaybackUrl } from "@/services/videoPlayback";
import {
  fetchCourseBySlugOrId,
  fetchCourseSections,
  fetchLessonProgress,
  updateLessonProgress,
  fetchCourseQuizzes,
} from "@/services/courses";
import { fetchStudentInstallments } from "@/services/payments";

import type {
  Course,
  CourseSection,
  Lesson,
  LessonProgress,
  Quiz,
} from "@/types";
import LessonVideoPlayer from "@/components/video/LessonVideoPlayer";

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

interface StoredVideo {
  lessonId: string;
  blobUrl: string;
  fileName: string;
  createdAt: number;
}

interface LessonProgressMap {
  [lessonId: string]: LessonProgress;
}

/* -------------------------------------------------------------------------- */
/* Constants                                                                  */
/* -------------------------------------------------------------------------- */

const FILE_BUCKET = "course-files";

const VIDEO_CACHE_PREFIX =
  "medcore-offline-video-";

const VIDEO_CACHE_DB = "medcore-video-cache";

const VIDEO_CACHE_STORE = "videos";

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

function formatFileSize(
  bytes: number | null | undefined
) {
  if (!bytes) return "0 KB";

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(1)} GB`;
}

function getFileIcon(
  mimeType: string | null,
  fileName: string
) {
  const mime = mimeType?.toLowerCase() ?? "";

  const extension =
    fileName
      .split(".")
      .pop()
      ?.toLowerCase() ?? "";

  if (
    mime.includes("pdf") ||
    extension === "pdf"
  ) {
    return FileText;
  }

  if (
    mime.includes("image") ||
    [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "gif",
      "svg",
    ].includes(extension)
  ) {
    return FileImage;
  }

  if (
    mime.includes("spreadsheet") ||
    mime.includes("excel") ||
    ["xls", "xlsx", "csv"].includes(
      extension
    )
  ) {
    return FileSpreadsheet;
  }

  if (
    mime.includes("video") ||
    [
      "mp4",
      "mov",
      "avi",
      "mkv",
      "webm",
    ].includes(extension)
  ) {
    return FileVideo;
  }

  if (
    mime.includes("zip") ||
    mime.includes("rar") ||
    ["zip", "rar", "7z"].includes(
      extension
    )
  ) {
    return FileArchive;
  }

  return File;
}

function getFileType(
  mimeType: string | null,
  fileName: string
) {
  const extension =
    fileName
      .split(".")
      .pop()
      ?.toUpperCase() ?? "FILE";

  if (mimeType?.includes("pdf"))
    return "PDF";

  if (mimeType?.includes("word"))
    return "Word";

  if (mimeType?.includes("excel"))
    return "Excel";

  if (mimeType?.includes("powerpoint"))
    return "PowerPoint";

  if (mimeType?.includes("image"))
    return "صورة";

  if (mimeType?.includes("video"))
    return "فيديو";

  return extension;
}

/* -------------------------------------------------------------------------- */
/* IndexedDB                                                                  */
/* -------------------------------------------------------------------------- */

function openVideoDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(
      VIDEO_CACHE_DB,
      1
    );

    request.onupgradeneeded = () => {
      const db = request.result;

      if (
        !db.objectStoreNames.contains(
          VIDEO_CACHE_STORE
        )
      ) {
        db.createObjectStore(
          VIDEO_CACHE_STORE,
          {
            keyPath: "lessonId",
          }
        );
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

async function saveOfflineVideo(
  lessonId: string,
  blob: Blob,
  fileName: string
) {
  const db = await openVideoDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          VIDEO_CACHE_STORE,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          VIDEO_CACHE_STORE
        );

      store.put({
        lessonId,
        blob,
        fileName,
        createdAt: Date.now(),
      });

      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(transaction.error);
    }
  );

  db.close();
}

async function getOfflineVideo(
  lessonId: string
): Promise<StoredVideo | null> {
  const db = await openVideoDB();

  return new Promise((resolve) => {
    const transaction =
      db.transaction(
        VIDEO_CACHE_STORE,
        "readonly"
      );

    const store =
      transaction.objectStore(
        VIDEO_CACHE_STORE
      );

    const request =
      store.get(lessonId);

    request.onsuccess = () => {
      db.close();

      const result = request.result;

      if (!result) {
        resolve(null);
        return;
      }

      const blobUrl =
        URL.createObjectURL(
          result.blob
        );

      resolve({
        lessonId: result.lessonId,
        blobUrl,
        fileName: result.fileName,
        createdAt: result.createdAt,
      });
    };

    request.onerror = () => {
      db.close();
      resolve(null);
    };
  });
}

async function deleteOfflineVideo(
  lessonId: string
) {
  const db = await openVideoDB();

  await new Promise<void>(
    (resolve, reject) => {
      const transaction =
        db.transaction(
          VIDEO_CACHE_STORE,
          "readwrite"
        );

      const store =
        transaction.objectStore(
          VIDEO_CACHE_STORE
        );

      store.delete(lessonId);

      transaction.oncomplete = () =>
        resolve();

      transaction.onerror = () =>
        reject(transaction.error);
    }
  );

  db.close();
}

/* -------------------------------------------------------------------------- */
/* Lesson Files                                                               */
/* -------------------------------------------------------------------------- */

function LessonFiles({
  files,
  loading,
}: {
  files: LessonFile[];
  loading: boolean;
}) {
  const [openingId, setOpeningId] =
    useState<string | null>(null);

  const openFile = async (
    file: LessonFile
  ) => {
    setOpeningId(file.id);

    try {
      const {
        data,
        error,
      } = await supabase.storage
        .from(FILE_BUCKET)
        .createSignedUrl(
          file.file_path,
          60 * 60
        );

      if (error) {
        throw error;
      }

      if (data?.signedUrl) {
        window.open(
          data.signedUrl,
          "_blank",
          "noopener,noreferrer"
        );
      }
    } catch (error) {
      console.error(
        "Open lesson file error:",
        error
      );

      alert(
        "تعذر فتح الملف. حاول مرة أخرى."
      );
    } finally {
      setOpeningId(null);
    }
  };

  if (loading) {
    return (
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <Loader2 className="h-5 w-5 animate-spin text-brand-600" />

          <span className="text-sm text-slate-500">
            جاري تحميل ملفات الدرس...
          </span>
        </div>
      </div>
    );
  }

  if (!files.length) {
    return (
      <div className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-400">
            <FolderOpen className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-bold text-slate-800">
              ملفات الدرس
            </h3>

            <p className="mt-1 text-xs text-slate-400">
              لا توجد ملفات مرفقة بهذا الدرس.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className="border-b border-slate-200 bg-slate-50 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <FolderOpen className="h-5 w-5" />
          </div>

          <div>
            <h3 className="font-black text-slate-900">
              ملفات الدرس
            </h3>

            <p className="mt-1 text-xs text-slate-500">
              {files.length} ملف متاح للتحميل
            </p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {files.map((file) => {
          const Icon = getFileIcon(
            file.mime_type,
            file.file_name
          );

          const opening =
            openingId === file.id;

          return (
            <div
              key={file.id}
              className="flex flex-col gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                  <Icon className="h-5 w-5" />
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-800">
                    {file.title}
                  </p>

                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                    <span>
                      {getFileType(
                        file.mime_type,
                        file.file_name
                      )}
                    </span>

                    <span>•</span>

                    <span>
                      {formatFileSize(
                        file.file_size
                      )}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                disabled={opening}
                onClick={() =>
                  openFile(file)
                }
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 disabled:opacity-50"
              >
                {opening ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Download className="h-4 w-4" />
                )}

                فتح الملف
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Sidebar                                                                    */
/* -------------------------------------------------------------------------- */

function SidebarContent({
  sections,
  activeLessonId,
  progress,
  isLessonLocked,
  onSelectLesson,
  onClose,
}: {
  sections: SectionWithLessons[];
  activeLessonId: string | null;
  progress: LessonProgressMap;
  isLessonLocked: (lesson: LessonWithFiles) => boolean;
  onSelectLesson: (
    lesson: LessonWithFiles
  ) => void;
  onClose?: () => void;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-lg ">
      <div className="border-b border-slate-200 p-5">
        <div className=" flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-900">
              محتوى الكورس
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              اختر الدرس الذي تريد متابعته
            </p>
          </div>

          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {sections.map(
          (section, sectionIndex) => {
            const lessons =
              section.lessons ?? [];

            return (
              <div
                key={section.id}
                className="mb-4"
              >
                <div className="mb-2 flex items-center gap-2 px-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50 text-xs font-black text-brand-700">
                    {sectionIndex + 1}
                  </span>

                  <h3 className="min-w-0 flex-1 truncate text-xs font-black text-slate-700">
                    {section.title}
                  </h3>
                </div>

                <div className="space-y-1">
                  {lessons.map(
                    (lesson, index) => {
                      const isActive =
                        lesson.id ===
                        activeLessonId;

                      const lessonProgress =
                        progress[
                          lesson.id
                        ];

                      const completed =
                        Boolean(
                          lessonProgress?.completed
                        );

                      const filesCount =
                        lesson.files?.length ??
                        0;

                      const locked = isLessonLocked(lesson);

                      return (
                        <button
                          key={lesson.id}
                          type="button"
                          disabled={locked}
                          onClick={() => {
                            onSelectLesson(
                              lesson
                            );
                            onClose?.();
                          }}
                          className={`group flex w-full items-start gap-3 rounded-xl p-3 text-right transition ${
                            isActive
                              ? "bg-brand-50 text-brand-800"
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">
                            {completed ? (
                              locked ? (
                                <Lock className="h-5 w-5 text-slate-400" />
                              ) : (
                                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                              )
                            ) : isActive ? (
                              <PlayCircle className="h-5 w-5 text-brand-600" />
                            ) : (
                              <Circle className="h-5 w-5 text-slate-300" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-start gap-2">
                              <span
                                className={`text-sm font-semibold leading-5 ${
                                  isActive
                                    ? "text-brand-800"
                                    : locked
                                      ? "text-slate-400"
                                      : "text-slate-700"
                                }`}
                              >
                                {index + 1}.{" "}
                                {lesson.title}
                              </span>
                            </div>

                            <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px]">
                              {lesson.is_preview && (
                                <span className="rounded-md bg-emerald-50 px-1.5 py-0.5 text-emerald-600">
                                  معاينة
                                </span>
                              )}

                              {filesCount > 0 && (
                                <span className="inline-flex items-center gap-1 text-slate-400">
                                  <FolderOpen className="h-3 w-3" />
                                  {filesCount}
                                </span>
                              )}

                              {locked && (
                                <span className="inline-flex items-center gap-1 text-slate-400">
                                  <Lock className="h-3 w-3" />
                                  متاح بعد سداد القسط
                                </span>
                              )}
                            </div>

                            {lessonProgress && (
                              <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-200">
                                <div
                                  className="h-full rounded-full bg-brand-500 transition-all"
                                  style={{
                                    width: `${lessonProgress.completed ? 100 : 0}%`,
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              </div>
            );
          }
        )}

        {sections.length === 0 && (
          <div className="p-6 text-center text-sm text-slate-400">
            لا توجد دروس في هذا الكورس.
          </div>
        )}
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Main Page                                                                  */
/* -------------------------------------------------------------------------- */

export default function LearningPage() {
  const { courseId } =
    useParams<{
      courseId: string;
    }>();

  const { session, profile } = useAuth();

  const videoRef =
    useRef<HTMLVideoElement | null>(
      null
    );

  const watermarkRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const [course, setCourse] =
    useState<Course | null>(null);

  const [sections, setSections] =
    useState<SectionWithLessons[]>([]);

  const [quizzes, setQuizzes] =
    useState<Quiz[]>([]);

  const [installments, setInstallments] =
    useState<import("@/types").StudentInstallment[]>([]);

  const [hasFullPayment, setHasFullPayment] =
    useState(false);

  const [lessonProgress, setLessonProgress] =
    useState<LessonProgressMap>({});

  const [activeLesson, setActiveLesson] =
    useState<LessonWithFiles | null>(null);

  const [activeVideoUrl, setActiveVideoUrl] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

const [videoLoading, setVideoLoading] =
  useState(false);

const [videoDownloadPct, setVideoDownloadPct] =
  useState(0); // جديد

  const [filesLoading, setFilesLoading] =
    useState(false);

  const [activeLessonFiles, setActiveLessonFiles] =
    useState<LessonFile[]>([]);

  const [mobileSidebarOpen, setMobileSidebarOpen] =
    useState(false);

  const [desktopSidebarOpen, setDesktopSidebarOpen] =
    useState(true);

  const [offlineVideo, setOfflineVideo] =
    useState<StoredVideo | null>(null);

  const [downloadingOffline, setDownloadingOffline] =
    useState(false);

  const [offlineProgress, setOfflineProgress] =
    useState(0);

  const [showOfflineMenu, setShowOfflineMenu] =
    useState(false);

  const [screenRecordingDetected, setScreenRecordingDetected] =
    useState(false);

  const approvedInstallmentMonths = useMemo(
    () =>
      new Set(
        installments
          .filter((installment) => installment.status === "approved")
          .map((installment) => installment.month_number)
      ),
    [installments]
  );

  const isSectionLocked = useCallback(
    (section: Pick<SectionWithLessons, "unlock_month">) =>
      Boolean(
        course?.is_installment &&
          !hasFullPayment &&
          section.unlock_month > 1 &&
          !approvedInstallmentMonths.has(section.unlock_month)
      ),
    [approvedInstallmentMonths, course?.is_installment, hasFullPayment]
  );

  const isLessonLocked = useCallback(
    (lesson: LessonWithFiles) => {
      const section = sections.find(
        (item) => item.id === lesson.section_id
      );

      return section ? isSectionLocked(section) : false;
    },
    [isSectionLocked, sections]
  );

  const handleSuspiciousActivity = useCallback(
    (_reason: string) => {
      setScreenRecordingDetected(true);
      videoRef.current?.pause();

      window.setTimeout(() => {
        setScreenRecordingDetected(false);
      }, 3000);
    },
    []
  );

  useScreenRecordingGuard({
    onSuspiciousActivity: handleSuspiciousActivity,
  });

  /* ---------------------------------------------------------------------- */
  /* Load course                                                             */
  /* ---------------------------------------------------------------------- */

  const loadCourse = useCallback(
    async () => {
      if (!courseId) return;

      setLoading(true);

      try {
        const loadedCourse =
          await fetchCourseBySlugOrId(
            courseId
          );

        if (!loadedCourse) {
          throw new Error(
            "لم يتم العثور على الكورس"
          );
        }

        setCourse(loadedCourse);

        const loadedSections =
          await fetchCourseSections(
            loadedCourse.id
          );

        const normalizedSections =
          (loadedSections ?? []) as SectionWithLessons[];

        setSections(
          normalizedSections
        );

        const allLessons =
          normalizedSections.flatMap(
            (section) =>
              section.lessons ?? []
          );

        if (allLessons.length) {
          setActiveLesson(
            (current) =>
              current
                ? allLessons.find(
                    (lesson) =>
                      lesson.id ===
                      current.id
                  ) ?? allLessons[0]
                : allLessons[0]
          );
        }

        const loadedQuizzes =
          await fetchCourseQuizzes(
            loadedCourse.id
          );

        setQuizzes(
          (loadedQuizzes ??
            []) as Quiz[]
        );

        const userResult =
          await supabase.auth.getUser();

        const user =
          userResult.data.user;

        if (user) {
          if (loadedCourse.is_installment) {
            const loadedInstallments =
              await fetchStudentInstallments(user.id);

            setInstallments(
              loadedInstallments.filter(
                (installment) =>
                  installment.course_id === loadedCourse.id
              )
            );

            const { data: fullPayment } = await supabase
              .from("payments")
              .select("id")
              .eq("student_id", user.id)
              .eq("course_id", loadedCourse.id)
              .eq("status", "approved")
              .is("installment_id", null)
              .maybeSingle();

            setHasFullPayment(Boolean(fullPayment));
          } else {
            setInstallments([]);
            setHasFullPayment(false);
          }

          const progress =
            await fetchLessonProgress(
              user.id,
              loadedCourse.id
            );

          const map: LessonProgressMap =
            {};

          for (const item of progress ??
            []) {
            map[item.lesson_id] =
              item;
          }

          setLessonProgress(map);
        }
      } catch (error) {
        console.error(
          "Learning page load error:",
          error
        );
      } finally {
        setLoading(false);
      }
    },
    [courseId]
  );

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  /* ---------------------------------------------------------------------- */
  /* Load lesson files                                                       */
  /* ---------------------------------------------------------------------- */

  const loadLessonFiles = useCallback(
    async (lessonId: string) => {
      setFilesLoading(true);

      try {
        const {
          data,
          error,
        } = await supabase
          .from("lesson_files")
          .select("*")
          .eq("lesson_id", lessonId)
          .order("order_index", {
            ascending: true,
          });

        if (error) {
          throw error;
        }

        setActiveLessonFiles(
          (data ?? []) as LessonFile[]
        );
      } catch (error) {
        console.error(
          "Load lesson files error:",
          error
        );

        setActiveLessonFiles([]);
      } finally {
        setFilesLoading(false);
      }
    },
    []
  );

  /* ---------------------------------------------------------------------- */
  /* Get video URL                                                           */
  /* ---------------------------------------------------------------------- */
const loadLessonVideo = useCallback(
  async (lesson: LessonWithFiles) => {
    setVideoLoading(true);
    setActiveVideoUrl(null);
    setOfflineVideo(null);

    try {
      if (isLessonLocked(lesson)) {
        console.log(
          "Lesson is locked, skipping video load"
        );

        return;
      }

      const cached = await getOfflineVideo(
        lesson.id
      );

      if (cached) {
        console.log(
          "Using cached offline video"
        );

        setOfflineVideo(cached);
        setActiveVideoUrl(
          cached.blobUrl
        );

        return;
      }

      const bunnyVideoId = (
        lesson as LessonWithFiles & {
          bunny_video_id?: string;
        }
      ).bunny_video_id;

      console.log(
        "Lesson object:",
        lesson
      );

      console.log(
        "bunnyVideoId:",
        bunnyVideoId
      );

      if (!bunnyVideoId) {
        console.log(
          "No bunnyVideoId found on lesson"
        );

        setActiveVideoUrl(null);

        return;
      }

      const url =
        await getLessonPlaybackUrl(
          bunnyVideoId
        );

      console.log(
        "Playback URL received:",
        url
      );

      setActiveVideoUrl(url);
    } catch (error) {
      console.error(
        "Load lesson video error:",
        error
      );

      setActiveVideoUrl(null);
    } finally {
      setVideoLoading(false);
    }
  },
  [isLessonLocked]
);
  /* ---------------------------------------------------------------------- */
  /* Active lesson                                                           */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    if (!activeLesson) return;

    loadLessonFiles(
      activeLesson.id
    );

    loadLessonVideo(
      activeLesson
    );
  }, [
    activeLesson,
    loadLessonFiles,
    loadLessonVideo,
  ]);

  /* ---------------------------------------------------------------------- */
  /* Offline video cleanup                                                   */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    return () => {
      if (
        activeVideoUrl?.startsWith("blob:") &&
        !offlineVideo
      ) {
        URL.revokeObjectURL(
          activeVideoUrl
        );
      }
    };
  }, [activeVideoUrl, offlineVideo]);

  useEffect(() => {
    return () => {
      if (offlineVideo?.blobUrl) {
        URL.revokeObjectURL(
          offlineVideo.blobUrl
        );
      }
    };
  }, [offlineVideo]);

  /* ---------------------------------------------------------------------- */
  /* Navigation                                                              */
  /* ---------------------------------------------------------------------- */

  const allLessons = useMemo(
    () =>
      sections.flatMap(
        (section) =>
          section.lessons ?? []
      ),
    [sections]
  );

  useEffect(() => {
    if (!activeLesson || !isLessonLocked(activeLesson)) return;

    const firstAvailableLesson = allLessons.find(
      (lesson) => !isLessonLocked(lesson)
    );

    setActiveLesson(firstAvailableLesson ?? null);
  }, [activeLesson, allLessons, isLessonLocked]);

  const activeLessonIndex =
    activeLesson
      ? allLessons.findIndex(
          (lesson) =>
            lesson.id ===
            activeLesson.id
        )
      : -1;

  const previousLesson =
    activeLessonIndex > 0
      ? allLessons[
          activeLessonIndex - 1
        ]
      : null;

  const nextLesson =
    activeLessonIndex >= 0 &&
    activeLessonIndex <
      allLessons.length - 1
      ? allLessons[
          activeLessonIndex + 1
        ]
      : null;

  const goToLesson = (
    lesson: LessonWithFiles | null
  ) => {
    if (!lesson) return;

    setActiveLesson(lesson);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  /* ---------------------------------------------------------------------- */
  /* Mark progress                                                           */
  /* ---------------------------------------------------------------------- */
const markLessonCompleted = useCallback(
  async (durationSeconds?: number) => {
    if (!activeLesson) return;
    const userResult = await supabase.auth.getUser();
    const user = userResult.data.user;
    if (!user || !course) return;

    try {
      const updated = await updateLessonProgress(
        user.id,
        activeLesson.id,
        course.id,
        durationSeconds ?? 0,
        true
      );
      setLessonProgress((current) => ({
        ...current,
        [activeLesson.id]: updated,
      }));
    } catch (error) {
      console.error("Update lesson progress error:", error);
    }
  },
  [activeLesson, course]
);

  /* ---------------------------------------------------------------------- */
  /* Video progress                                                          */
  /* ---------------------------------------------------------------------- */

  const handleVideoTimeUpdate =
    async () => {
      if (
        !videoRef.current ||
        !activeLesson ||
        !course
      ) {
        return;
      }

      const video =
        videoRef.current;

      if (!video.duration) return;

      const percentage = Math.round(
        (video.currentTime /
          video.duration) *
          100
      );

      if (
        percentage < 90
      ) {
        return;
      }

      await markLessonCompleted();
    };

  /* ---------------------------------------------------------------------- */
  /* Offline download                                                        */
  /* ---------------------------------------------------------------------- */

  const downloadOfflineVideo =
    async () => {
      if (
        !activeLesson ||
        !course
      ) {
        return;
      }

      if (isLessonLocked(activeLesson)) {
        alert(
          "هذا الدرس مقفول حتى اعتماد القسط المطلوب."
        );
        return;
      }

      const bunnyVideoId = (
        activeLesson as LessonWithFiles & { bunny_video_id?: string }
      ).bunny_video_id;

      if (!bunnyVideoId) {
        alert(
          "لا يوجد فيديو متاح لهذا الدرس."
        );
        return;
      }

      setDownloadingOffline(true);
      setOfflineProgress(0);
      setShowOfflineMenu(false);

      try {
        const { data, error } =
          await supabase.functions.invoke(
            "get-bunny-download-url",
            { body: { videoId: bunnyVideoId } }
          );

        if (error) {
          throw error;
        }

        if (!data?.url) {
          throw new Error(
            "تعذر الحصول على رابط الفيديو"
          );
        }

        const response =
          await fetch(
            data.url
          );

        if (!response.ok) {
          throw new Error(
            "تعذر تحميل الفيديو"
          );
        }

        const contentLength =
          response.headers.get(
            "content-length"
          );

        const total =
          Number(
            contentLength ?? 0
          );

        const reader =
          response.body?.getReader();

        if (!reader) {
          throw new Error(
            "المتصفح لا يدعم تحميل الفيديو"
          );
        }

        const chunks: ArrayBuffer[] =
          [];

        let received = 0;

        while (true) {
          const {
            done,
            value,
          } = await reader.read();

          if (done) break;

          if (value) {
            const chunk = new Uint8Array(
              value.byteLength
            );

            chunk.set(value);
            chunks.push(
              chunk.buffer as ArrayBuffer
            );
            received += value.length;

            if (total > 0) {
              setOfflineProgress(
                Math.round(
                  (received / total) *
                    100
                )
              );
            }
          }
        }

        const blob = new Blob(
          chunks,
          {
            type:
              response.headers.get(
                "content-type"
              ) ??
              "video/mp4",
          }
        );

        await saveOfflineVideo(
          activeLesson.id,
          blob,
          `${activeLesson.title}.mp4`
        );

        const cached =
          await getOfflineVideo(
            activeLesson.id
          );

        if (cached) {
          setOfflineVideo(cached);
        }

        setOfflineProgress(100);
      } catch (error) {
        console.error(
          "Offline download error:",
          error
        );

        alert(
          "تعذر حفظ الفيديو بدون إنترنت."
        );
      } finally {
        setDownloadingOffline(false);
      }
    };

  /* ---------------------------------------------------------------------- */
  /* Delete offline                                                          */
  /* ---------------------------------------------------------------------- */

  const removeOfflineVideo =
    async () => {
      if (!activeLesson) return;

      const confirmed =
        window.confirm(
          "هل تريد حذف نسخة الفيديو المحفوظة بدون إنترنت؟"
        );

      if (!confirmed) return;

      try {
        if (offlineVideo?.blobUrl) {
          URL.revokeObjectURL(
            offlineVideo.blobUrl
          );
        }

        await deleteOfflineVideo(
          activeLesson.id
        );

        setOfflineVideo(null);

        await loadLessonVideo(
          activeLesson
        );
      } catch (error) {
        console.error(
          "Delete offline video error:",
          error
        );
      }
    };

  /* ---------------------------------------------------------------------- */
  /* Keyboard protection                                                     */
  /* ---------------------------------------------------------------------- */

  useEffect(() => {
    const handleKeyDown = (
      event: KeyboardEvent
    ) => {
      const key = event.key.toLowerCase();

      if (
        event.key === "PrintScreen" ||
        (event.metaKey &&
          event.shiftKey &&
          ["3", "4", "5"].includes(event.key)) ||
        (event.ctrlKey &&
          event.shiftKey &&
          key === "s")
      ) {
        handleSuspiciousActivity("screenshot_shortcut");
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleSuspiciousActivity]);

  /* ---------------------------------------------------------------------- */
  /* Calculate overall progress                                              */
  /* ---------------------------------------------------------------------- */

  const overallProgress =
    useMemo(() => {
      if (!allLessons.length) return 0;

      const completed =
        allLessons.filter(
          (lesson) =>
            lessonProgress[
              lesson.id
            ]?.completed
        ).length;

      return Math.round(
        (completed /
          allLessons.length) *
          100
      );
    }, [
      allLessons,
      lessonProgress,
    ]);

  const activeSection = useMemo(
    () =>
      sections.find((section) =>
        section.lessons?.some(
          (lesson) => lesson.id === activeLesson?.id
        )
      ),
    [sections, activeLesson]
  );

  const visibleQuizzes = useMemo(
    () =>
      quizzes.filter(
        (quiz) =>
          (!quiz.section_id && !quiz.lesson_id) ||
          quiz.lesson_id === activeLesson?.id ||
          quiz.section_id === activeSection?.id
      ),
    [quizzes, activeLesson, activeSection]
  );

  const courseQuizzes = useMemo(
    () =>
      visibleQuizzes.filter(
        (quiz) => !quiz.section_id && !quiz.lesson_id
      ),
    [visibleQuizzes]
  );

  const targetedQuizzes = useMemo(
    () =>
      visibleQuizzes.filter(
        (quiz) => quiz.section_id || quiz.lesson_id
      ),
    [visibleQuizzes]
  );

  /* ---------------------------------------------------------------------- */
  /* Loading                                                                 */
  /* ---------------------------------------------------------------------- */

  if (loading) {
    return (
      <div
        dir="rtl"
        className="min-h-screen bg-slate-50 p-4"
      >
        <div className="mx-auto max-w-7xl animate-pulse space-y-5">
          <div className="h-16 rounded-2xl bg-slate-200" />

          <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
            <div className="h-[600px] rounded-3xl bg-slate-200" />

            <div className="space-y-5">
              <div className="aspect-video rounded-3xl bg-slate-200" />

              <div className="h-48 rounded-3xl bg-slate-200" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div
        dir="rtl"
        className="flex min-h-screen items-center justify-center bg-slate-50 p-5"
      >
        <div className="rounded-3xl border border-red-200 bg-white p-8 text-center">
          <AlertCircle className="mx-auto h-10 w-10 text-red-500" />

          <h1 className="mt-4 font-black text-slate-900">
            لم يتم العثور على الكورس
          </h1>

          <Link
            to="/courses"
            className="mt-5 inline-flex rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
          >
            العودة للكورسات
          </Link>
        </div>
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /* Render                                                                  */
  /* ---------------------------------------------------------------------- */

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-slate-50"
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-3 px-4 sm:px-6">
          <button
            type="button"
            onClick={() =>
              setMobileSidebarOpen(true)
            }
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/courses"
            aria-label="العودة للكورسات"
            title="العودة للكورسات"
            className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 lg:hidden"
          >
            <ArrowRight className="h-5 w-5" />
          </Link>

          <button
            type="button"
            onClick={() =>
              setDesktopSidebarOpen(
                (value) => !value
              )
            }
            aria-label={
              desktopSidebarOpen
                ? "إغلاق قائمة محتوى الكورس"
                : "فتح قائمة محتوى الكورس"
            }
            title={
              desktopSidebarOpen
                ? "إغلاق قائمة المحتوى"
                : "فتح قائمة المحتوى"
            }
            className="hidden h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-brand-50 hover:text-brand-700 lg:flex"
          >
            {desktopSidebarOpen ? (
              <PanelRightClose className="h-5 w-5" />
            ) : (
              <PanelRightOpen className="h-5 w-5" />
            )}
          </button>

          <Link
            to="/courses"
            className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 lg:flex"
          >
            <ArrowRight className="h-4 w-4" />
            الكورسات
          </Link>

          <div className="h-6 w-px bg-slate-200" />

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-900">
              {course.title}
            </p>

            <div className="mt-1 flex items-center gap-2">
              <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 sm:w-28">
                <div
                  className="h-full rounded-full bg-brand-500 transition-all"
                  style={{
                    width: `${overallProgress}%`,
                  }}
                />
              </div>

              <span className="text-[10px] font-bold text-slate-400">
                {overallProgress}% مكتمل
              </span>
            </div>
          </div>

          <div className="hidden items-center gap-2 sm:flex">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
              <Trophy className="h-3.5 w-3.5" />
              {allLessons.filter(
                (lesson) =>
                  lessonProgress[
                    lesson.id
                  ]?.completed
              ).length}
              /{allLessons.length}
            </span>
          </div>
        </div>
      </header>

      {/* Main */}
      <div className="mx-auto max-w-[1600px] px-0 lg:pl-4">
        <div className="grid min-h-[calc(100vh-64px)] lg:grid-cols-[auto_minmax(0,1fr)]">
          {/* Desktop Sidebar */}
          <div
            className={`hidden overflow-hidden transition-[width] duration-300 ease-in-out lg:block bg-white ${
              desktopSidebarOpen
                ? "w-[320px]"
                : "w-0"
            }`}
          >
            <aside className="sticky top-16 h-[calc(100vh-64px)] w-[320px] border-l border-slate-200 bg-white shadow-[inset_-1px_0_0_rgba(226,232,240,0.7)]">
              <SidebarContent
                sections={sections}
                activeLessonId={
                  activeLesson?.id ?? null
                }
                progress={
                  lessonProgress
                }
                isLessonLocked={isLessonLocked}
                onSelectLesson={
                  setActiveLesson
                }
              />
            </aside>
          </div>

          {/* Mobile Sidebar */}
          <AnimatePresence>
            {mobileSidebarOpen && (
              <>
                <motion.div
                  initial={{
                    opacity: 0,
                  }}
                  animate={{
                    opacity: 1,
                  }}
                  exit={{
                    opacity: 0,
                  }}
                  onClick={() =>
                    setMobileSidebarOpen(
                      false
                    )
                  }
                  className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-sm lg:hidden"
                />

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
                    damping: 28,
                    stiffness: 260,
                  }}
                  className="fixed inset-y-0 right-0 z-[60] w-[88%] max-w-sm bg-white shadow-2xl lg:hidden"
                >
                  <SidebarContent
                    sections={sections}
                    activeLessonId={
                      activeLesson?.id ??
                      null
                    }
                    progress={
                      lessonProgress
                    }
                    isLessonLocked={isLessonLocked}
                    onSelectLesson={
                      setActiveLesson
                    }
                    onClose={() =>
                      setMobileSidebarOpen(
                        false
                      )
                    }
                  />
                </motion.aside>
              </>
            )}
          </AnimatePresence>

          {/* Content */}
          <main className="min-w-0 p-3 sm:p-5 lg:p-7">
            {!activeLesson ? (
              <div className="flex min-h-[70vh] items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white">
                <div className="text-center">
                  <BookOpen className="mx-auto h-12 w-12 text-slate-300" />

                  <h2 className="mt-4 font-black text-slate-800">
                    لا يوجد درس محدد
                  </h2>

                  <p className="mt-2 text-sm text-slate-400">
                    اختر درسًا من قائمة محتوى الكورس.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-5xl">
                {/* Breadcrumb */}
                <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
                  <span>
                    الكورس
                  </span>

                  <ChevronLeft className="h-3.5 w-3.5" />

                  <span>
                    {
                      sections.find(
                        (section) =>
                          section.lessons?.some(
                            (lesson) =>
                              lesson.id ===
                              activeLesson.id
                          )
                      )?.title
                    }
                  </span>

                  <ChevronLeft className="h-3.5 w-3.5" />

                  <span className="font-bold text-slate-600">
                    {activeLesson.title}
                  </span>
                </div>

                {/* Video */}
                <div className="relative overflow-hidden rounded-3xl bg-black shadow-2xl">
{videoLoading ? (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
    <Loader2 className="h-10 w-10 animate-spin text-white" />
    {videoDownloadPct > 0 && (
      <span className="text-sm font-bold text-white/80">
        {videoDownloadPct}%
      </span>
    )}
  </div>
) : activeVideoUrl ? (
  <LessonVideoPlayer
    key={activeVideoUrl}
    src={activeVideoUrl}
    onTimeUpdate={(currentTime, duration) => {
      if (!duration) return;
      const percentage = Math.round((currentTime / duration) * 100);
      if (percentage >= 90) markLessonCompleted();
    }}
    onEnded={markLessonCompleted}
    className="h-full w-full"
  />
) : (
                      <div className="absolute inset-0 flex flex-col items-center justify-center px-5 text-center">
                        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 text-white">
                          <VideoIcon />
                        </div>

                        <h3 className="mt-4 font-bold text-white">
                          لا يوجد فيديو لهذا الدرس
                        </h3>

                        <p className="mt-2 text-xs text-white/50">
                          يمكنك الاطلاع على الملفات والوصف بالأسفل.
                        </p>
                      </div>
                    )}

                    {/* Fixed brand watermark */}
                    <div className="pointer-events-none absolute left-4 top-4 rounded-lg bg-black/30 px-3 py-1.5 text-[10px] font-bold text-white/60 backdrop-blur">
                      MedCore
                    </div>

                    <VideoWatermark
                      phone={
                        profile?.phone ??
                        session?.user.phone ??
                        "عضو MedCore"
                      }
                      name={
                        profile?.full_name ??
                        session?.user.user_metadata?.full_name ??
                        "مستخدم MedCore"
                      }
                      containerRef={watermarkRef}
                    />

                    {/* Recording warning */}
                    <AnimatePresence>
                      {screenRecordingDetected && (
                        <motion.div
                          initial={{
                            opacity: 0,
                            scale: 0.95,
                          }}
                          animate={{
                            opacity: 1,
                            scale: 1,
                          }}
                          exit={{
                            opacity: 0,
                          }}
                          className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 p-5 text-center backdrop-blur-sm"
                        >
                          <div>
                            <Lock className="mx-auto h-10 w-10 text-red-400" />

                            <h3 className="mt-4 text-lg font-black text-white">
                              المحتوى محمي
                            </h3>

                            <p className="mt-2 text-sm text-white/60">
                              لا يسمح بتسجيل أو تصوير محتوى الدرس.
                            </p>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </div>

                {/* Video Offline */}
                {activeVideoUrl && (
                  <div className="relative mt-3">
                    <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                            offlineVideo
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {offlineVideo ? (
                            <WifiOff className="h-5 w-5" />
                          ) : (
                            <Wifi className="h-5 w-5" />
                          )}
                        </div>

                        <div>
                          <p className="text-sm font-bold text-slate-800">
                            {offlineVideo
                              ? "الفيديو محفوظ بدون إنترنت"
                              : "مشاهدة بدون إنترنت"}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            {offlineVideo
                              ? "يمكنك تشغيل الفيديو بدون اتصال."
                              : "احفظ الفيديو على جهازك للمشاهدة لاحقًا."}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          if (
                            offlineVideo
                          ) {
                            setShowOfflineMenu(
                              (value) =>
                                !value
                            );
                          } else {
                            downloadOfflineVideo();
                          }
                        }}
                        disabled={
                          downloadingOffline
                        }
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white disabled:opacity-50"
                      >
                        {downloadingOffline ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {offlineProgress}%
                          </>
                        ) : offlineVideo ? (
                          <>
                            <WifiOff className="h-4 w-4" />
                            إدارة النسخة
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4" />
                            حفظ بدون إنترنت
                          </>
                        )}
                      </button>
                    </div>

                    <AnimatePresence>
                      {showOfflineMenu &&
                        offlineVideo && (
                          <motion.div
                            initial={{
                              opacity: 0,
                              y: -5,
                            }}
                            animate={{
                              opacity: 1,
                              y: 0,
                            }}
                            exit={{
                              opacity: 0,
                              y: -5,
                            }}
                            className="absolute left-0 top-full z-20 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xl sm:w-64"
                          >
                            <button
                              type="button"
                              onClick={
                                removeOfflineVideo
                              }
                              className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-right text-sm font-semibold text-red-600 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                              حذف النسخة المحفوظة
                            </button>
                          </motion.div>
                        )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Lesson Info */}
                <section className="mt-5 rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        {activeLesson.is_preview && (
                          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            معاينة مجانية
                          </span>
                        )}

                        {lessonProgress[
                          activeLesson.id
                        ]?.completed && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3" />
                            مكتمل
                          </span>
                        )}
                      </div>

                      <h1 className="text-xl font-black leading-8 text-slate-900 sm:text-2xl">
                        {activeLesson.title}
                      </h1>
                    </div>

                    <div className="shrink-0">
                      <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2">
                        <Clock3 className="h-4 w-4 text-slate-400" />

                        <span className="text-xs font-semibold text-slate-500">
                          الدرس{" "}
                          {activeLessonIndex +
                            1}{" "}
                          من{" "}
                          {allLessons.length}
                        </span>
                      </div>
                    </div>
                  </div>

                  {activeLesson.description && (
                    <div className="mt-5 border-t border-slate-100 pt-5">
                      <h2 className="mb-2 text-sm font-black text-slate-800">
                        وصف الدرس
                      </h2>

                      <p className="whitespace-pre-line text-sm leading-8 text-slate-600">
                        {
                          activeLesson.description
                        }
                      </p>
                    </div>
                  )}
                </section>

                {/* Lesson Files - immediately after lesson */}
                <LessonFiles
                  files={
                    activeLessonFiles
                  }
                  loading={filesLoading}
                />

                {/* Navigation */}
                <div className="mt-5 grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    disabled={!previousLesson}
                    onClick={() =>
                      goToLesson(
                        previousLesson
                      )
                    }
                    className="group flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-right transition hover:border-brand-200 hover:bg-brand-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 transition group-hover:bg-white group-hover:text-brand-600">
                      <ChevronRight className="h-5 w-5" />
                    </div>

                    <div className="min-w-0">
                      <span className="text-[10px] font-bold text-slate-400">
                        الدرس السابق
                      </span>

                      <p className="mt-1 truncate text-sm font-bold text-slate-700">
                        {previousLesson?.title ??
                          "لا يوجد"}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={!nextLesson}
                    onClick={() =>
                      goToLesson(
                        nextLesson
                      )
                    }
                    className="group flex items-center justify-between gap-3 rounded-2xl border border-brand-200 bg-brand-50 p-4 text-right transition hover:bg-brand-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-brand-600">
                        <ChevronLeft className="h-5 w-5" />
                      </div>

                      <div className="min-w-0">
                        <span className="text-[10px] font-bold text-brand-600">
                          الدرس التالي
                        </span>

                        <p className="mt-1 truncate text-sm font-bold text-brand-900">
                          {nextLesson?.title ??
                            "انتهت الدروس"}
                        </p>
                      </div>
                    </div>

                    {nextLesson && (
                      <ArrowLeft className="hidden h-4 w-4 text-brand-600 sm:block" />
                    )}
                  </button>
                </div>

                {/* Quizzes / Assignments */}
                {(courseQuizzes.length > 0 ||
                  targetedQuizzes.length > 0) && (
                  <div className="mt-6 space-y-4">
                    <QuizSection
                      quizzes={courseQuizzes}
                      title="اختبارات الكورس"
                      description="اختبارات عامة تشمل جميع دروس الكورس"
                      tone="violet"
                    />

                    <QuizSection
                      quizzes={targetedQuizzes}
                      title="اختبارات مخصصة"
                      description="اختبارات مرتبطة بهذا الدرس أو القسم"
                      tone="amber"
                    />
                  </div>
                )}

                {/* Course completion */}
                {overallProgress ===
                  100 && (
                  <div className="mt-6 rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm">
                      <Trophy className="h-7 w-7" />
                    </div>

                    <h2 className="mt-4 text-xl font-black text-emerald-900">
                      أحسنت! أكملت الكورس 🎉
                    </h2>

                    <p className="mt-2 text-sm text-emerald-700">
                      لقد أكملت جميع دروس هذا الكورس.
                    </p>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Small Video Icon                                                           */
/* -------------------------------------------------------------------------- */

function QuizSection({
  quizzes,
  title,
  description,
  tone,
}: {
  quizzes: Quiz[];
  title: string;
  description: string;
  tone: "violet" | "amber";
}) {
  if (!quizzes.length) return null;

  const styles =
    tone === "amber"
      ? {
          header: "bg-amber-50",
          icon: "bg-amber-100 text-amber-700",
          itemIcon: "bg-amber-50 text-amber-600",
        }
      : {
          header: "bg-violet-50",
          icon: "bg-violet-100 text-violet-700",
          itemIcon: "bg-violet-50 text-violet-600",
        };

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div className={`border-b border-slate-200 p-5 ${styles.header}`}>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-11 w-11 items-center justify-center rounded-xl ${styles.icon}`}
          >
            <ClipboardList className="h-5 w-5" />
          </div>

          <div>
            <h2 className="font-black text-slate-900">{title}</h2>
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          </div>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {quizzes.map((quiz, index) => (
          <Link
            key={quiz.id}
            to={`/app/quizzes/${quiz.id}`}
            className="flex items-center gap-4 p-4 transition hover:bg-slate-50"
          >
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${styles.itemIcon}`}
            >
              <ClipboardList className="h-5 w-5" />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold text-slate-800">
                {index + 1}. {quiz.title}
              </p>

              {quiz.description && (
                <p className="mt-1 line-clamp-1 text-xs text-slate-400">
                  {quiz.description}
                </p>
              )}
            </div>

            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
              <ChevronLeft className="h-4 w-4" />
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function VideoIcon() {
  return (
    <PlayCircle className="h-8 w-8" />
  );
}