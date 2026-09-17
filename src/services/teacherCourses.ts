import { supabase, supabaseUrl, supabaseAnonKey } from "@/lib/supabase";
import { slugify } from "@/utils/format";
import type { Course, CourseSection, Lesson } from "@/types";
import * as tus from "tus-js-client";

import { splitFileIntoChunks, getChunkPath } from "@/utils/videoChunking";
export async function fetchTeacherCourses(teacherId: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Course[];
}

export async function createCourse(params: { teacherId: string; title: string; description: string; college: string; price: number }) {
  const slug = `${slugify(params.title)}-${Date.now().toString(36)}`;
  const { data, error } = await supabase
    .from("courses")
    .insert({
      teacher_id: params.teacherId,
      title: params.title,
      description: params.description,
      college: params.college,
      price: params.price,
      slug,
      status: "draft",
      is_published: false,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Course;
}

export async function updateCourse(courseId: string, updates: Partial<Course>) {
  const { error } = await supabase.from("courses").update(updates).eq("id", courseId);
  if (error) throw error;
}

export async function togglePublish(courseId: string, publish: boolean) {
  const { error } = await supabase
    .from("courses")
    .update({ is_published: publish, status: publish ? "published" : "draft" })
    .eq("id", courseId);
  if (error) throw error;
}

export async function deleteCourse(courseId: string) {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

export async function uploadThumbnail(courseId: string, file: File) {
  const ext = file.name.split(".").pop();
  const path = `${courseId}/thumbnail.${ext}`;
  const { error } = await supabase.storage.from("course-thumbnails").upload(path, file, { upsert: true });
  if (error) throw error;
  await updateCourse(courseId, { thumbnail_path: path });
  return path;
}

// ===== الأقسام =====

export async function fetchSections(courseId: string) {
  const { data, error } = await supabase
    .from("course_sections")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("order_index");
  if (error) throw error;
  return (data ?? []) as unknown as CourseSection[];
}

export async function createSection(courseId: string, title: string, orderIndex: number) {
  const { data, error } = await supabase
    .from("course_sections")
    .insert({ course_id: courseId, title, order_index: orderIndex })
    .select()
    .single();
  if (error) throw error;
  return data as CourseSection;
}

export async function deleteSection(sectionId: string) {
  const { error } = await supabase.from("course_sections").delete().eq("id", sectionId);
  if (error) throw error;
}

// ===== الدروس =====

export async function createLesson(params: { sectionId: string; title: string; description: string; orderIndex: number; isPreview: boolean }) {
  const { data, error } = await supabase
    .from("lessons")
    .insert({
      section_id: params.sectionId,
      title: params.title,
      description: params.description,
      order_index: params.orderIndex,
      is_preview: params.isPreview,
    })
    .select()
    .single();
  if (error) throw error;
  return data as Lesson;
}

/**
 * @deprecated Kept for backward compatibility / any other callers.
 * The Course Builder page now uploads via a direct XHR call to the Supabase
 * Storage REST endpoint (see CourseBuilderPage.tsx) so it can report real
 * upload progress, which supabase-js's `.storage.upload()` does not expose.
 * New code that needs to attach an already-uploaded video's storage path to
 * a lesson should call `updateLessonVideoPath` below instead.
 */
export async function uploadLessonVideo(
  courseId: string,
  lessonId: string,
  file: File,
  onProgress?: (pct: number) => void
) {
  if (!(file instanceof File)) {
    throw new Error("الملف المرفوع غير صالح");
  }

  if (!file.size) {
    throw new Error("الفيديو فارغ");
  }

  const originalExt = file.name.split(".").pop()?.toLowerCase();
  const allowedExtensions = ["mp4", "webm", "mov", "m4v"];

  if (!originalExt || !allowedExtensions.includes(originalExt)) {
    throw new Error("صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV");
  }

  const ext = originalExt;
  const path = `${courseId}/${lessonId}.${ext}`;

  const contentType =
    file.type ||
    ({
      mp4: "video/mp4",
      webm: "video/webm",
      mov: "video/quicktime",
      m4v: "video/x-m4v",
    }[ext] ?? "application/octet-stream");

  const { error: uploadError } = await supabase.storage
    .from("course-videos")
    .upload(path, file, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(`فشل رفع الفيديو: ${uploadError.message}`);
  }

  onProgress?.(100);

  await updateLessonVideoPath(lessonId, path);

  return path;
}

/**
 * Links an already-uploaded storage path to a lesson row. Used after the
 * XHR-based upload in CourseBuilderPage.tsx succeeds. If linking fails, the
 * caller is responsible for deciding whether to remove the orphaned file.
 */
export async function updateLessonVideoPath(lessonId: string, path: string) {
  const { error } = await supabase
    .from("lessons")
    .update({ video_path: path })
    .eq("id", lessonId);

  if (error) {
    // Best-effort cleanup so we don't leave an orphaned file in storage.
    await supabase.storage.from("course-videos").remove([path]);
    throw new Error(`تم رفع الفيديو لكن تعذر ربطه بالدرس: ${error.message}`);
  }
}

export async function deleteLessonVideo(lessonId: string, videoPath: string) {
  const { error: storageError } = await supabase.storage
    .from("course-videos")
    .remove([videoPath]);

  if (storageError) {
    throw new Error(`تعذّر حذف الفيديو من التخزين: ${storageError.message}`);
  }

  const { error: dbError } = await supabase
    .from("lessons")
    .update({ video_path: null })
    .eq("id", lessonId);

  if (dbError) {
    throw new Error(`تم حذف الملف لكن تعذر تحديث الدرس: ${dbError.message}`);
  }
}

export async function deleteLesson(lessonId: string) {
  const { error } = await supabase.from("lessons").delete().eq("id", lessonId);
  if (error) throw error;
}

export async function reorderLessons(updates: { id: string; order_index: number }[]) {
  await Promise.all(updates.map((u) => supabase.from("lessons").update({ order_index: u.order_index }).eq("id", u.id)));
}

export async function setPreview(lessonId: string, isPreview: boolean) {
  const { error } = await supabase.from("lessons").update({ is_preview: isPreview }).eq("id", lessonId);
  if (error) throw error;
}

export async function updateSectionTitle(sectionId: string, title: string) {
  const { error } = await supabase
    .from("course_sections")
    .update({ title })
    .eq("id", sectionId);
  if (error) throw error;
}

export async function updateLessonTitle(lessonId: string, title: string) {
  const { error } = await supabase
    .from("lessons")
    .update({ title })
    .eq("id", lessonId);
  if (error) throw error;
}

export async function updateLessonDescription(lessonId: string, description: string) {
  const { error } = await supabase
    .from("lessons")
    .update({ description })
    .eq("id", lessonId);
  if (error) throw error;
}

export async function fetchCourseBySlugOrId(
  value: string
) {
  const cleanValue = value?.trim();

  if (!cleanValue) {
    throw new Error("Course slug or ID is required");
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  let query = supabase
    .from("courses")
    .select("*");

  if (uuidRegex.test(cleanValue)) {
    query = query.eq("id", cleanValue);
  } else {
    query = query.eq("slug", cleanValue);
  }

  const {
    data,
    error,
  } = await query.single();

  if (error) {
    console.error(
      "fetchCourseBySlugOrId error:",
      error
    );

    throw error;
  }

  return data;
}
export function getVideoStoragePath(
  lessonId: string,
  fileName: string
) {
  const extension =
    fileName.split(".").pop()?.toLowerCase() || "mp4";

  const uniqueName =
    `${crypto.randomUUID()}.${extension}`;

  return `${lessonId}/${uniqueName}`;
}
export async function updateLesson(
  lessonId: string,
  updates: {
    title?: string;
    description?: string | null;
    orderIndex?: number;
    isPreview?: boolean;
    videoPath?: string | null;
    durationSeconds?: number;
  }
) {
  if (!lessonId) {
    throw new Error("Lesson ID is required");
  }

  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    payload.title = updates.title;
  }

  if (updates.description !== undefined) {
    payload.description = updates.description;
  }

  if (updates.orderIndex !== undefined) {
    payload.order_index = updates.orderIndex;
  }

  if (updates.isPreview !== undefined) {
    payload.is_preview = updates.isPreview;
  }

  if (updates.videoPath !== undefined) {
    payload.video_path = updates.videoPath;
  }

  // حفظ مدة الفيديو بالثواني
  if (updates.durationSeconds !== undefined) {
    payload.duration_seconds = Math.max(
      0,
      Math.round(updates.durationSeconds)
    );
  }

  const { data, error } = await supabase
    .from("lessons")
    .update(payload)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) {
    console.error("updateLesson error:", error);
    throw error;
  }

  return data;
}
export async function updateSection(
  sectionId: string,
  updates: {
    title?: string;
    description?: string | null;
    orderIndex?: number;
    unlockMonth?: number;
  }
) {
  if (!sectionId) {
    throw new Error("Section ID is required");
  }

  const payload: Record<string, unknown> = {};

  if (updates.title !== undefined) {
    payload.title = updates.title;
  }

  if (updates.description !== undefined) {
    payload.description = updates.description;
  }

  if (updates.orderIndex !== undefined) {
    payload.order_index = updates.orderIndex;
  }

  if (updates.unlockMonth !== undefined) {
    payload.unlock_month = Math.max(1, Math.floor(updates.unlockMonth));
  }

  const { data, error } = await supabase
    .from("course_sections")
    .update(payload)
    .eq("id", sectionId)
    .select()
    .single();

  if (error) {
    console.error("updateSection error:", error);
    throw error;
  }

  return data;
}

// services/teacherCourses.ts

function uploadChunkWithProgress(
  bucket: string,
  path: string,
  chunk: Blob,
  contentType: string,
  accessToken: string,
  onChunkLoaded: (loadedBytes: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

    xhr.open("POST", url, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
    xhr.setRequestHeader("apikey", supabaseAnonKey);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.setRequestHeader("x-upsert", "true");
    xhr.setRequestHeader("cache-control", "3600");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onChunkLoaded(event.loaded);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        let message = xhr.responseText || `HTTP ${xhr.status}`;
        try {
          const parsed = JSON.parse(xhr.responseText);
          message = parsed.message || parsed.error || message;
        } catch {
          // تجاهل، استخدم النص الخام
        }
        reject(new Error(message));
      }
    };

    xhr.onerror = () => {
      reject(new Error("فشل الاتصال أثناء رفع الفيديو"));
    };

    xhr.onabort = () => {
      reject(new Error("تم إلغاء رفع الفيديو"));
    };

    xhr.send(chunk);
  });
}

// services/teacherCourses.ts
export async function uploadLessonVideoChunked(
  lessonId: string,
  file: File,
  onProgress?: (pct: number) => void
) {
  if (!(file instanceof File) || !file.size) {
    throw new Error("الملف غير صالح");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const accessToken = session?.access_token;

  if (!accessToken) {
    throw new Error("انتهت الجلسة، برجاء تسجيل الدخول مرة أخرى");
  }

  const chunks = splitFileIntoChunks(file);
  const contentType = file.type || "video/mp4";
  const totalBytes = file.size;

  await deleteLessonVideoChunks(lessonId);

  let completedBytes = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const path = getChunkPath(lessonId, i);
    const chunkOffset = completedBytes;

    try {
      await uploadChunkWithProgress(
        "course-videos",
        path,
        chunk,
        contentType,
        accessToken,
        (loadedInChunk) => {
          const overallLoaded = chunkOffset + loadedInChunk;
          const pct = Math.min(
            100,
            Math.round((overallLoaded / totalBytes) * 100)
          );
          onProgress?.(pct);
        }
      );
    } catch (err) {
      throw new Error(
        `فشل رفع الجزء ${i + 1}: ${
          err instanceof Error ? err.message : "خطأ غير معروف"
        }`
      );
    }

    completedBytes += chunk.size;

    const pct = Math.min(
      100,
      Math.round((completedBytes / totalBytes) * 100)
    );
    onProgress?.(pct);
  }

  const { error: dbError } = await supabase
    .from("lessons")
    .update({
      video_path: `${lessonId}/`,
      video_chunk_count: chunks.length,
    })
    .eq("id", lessonId);

  if (dbError) {
    throw new Error(`تم رفع الفيديو لكن تعذر ربطه بالدرس: ${dbError.message}`);
  }
}

export async function deleteLessonVideoChunks(lessonId: string) {
  const { data: existing } = await supabase
    .from("lessons")
    .select("video_chunk_count")
    .eq("id", lessonId)
    .maybeSingle();

  const count = existing?.video_chunk_count ?? 0;
  if (!count) {
    // برضه امسح video_path لو فيه قيمة قديمة عالقة
    await supabase
      .from("lessons")
      .update({ video_path: null, video_chunk_count: 0 })
      .eq("id", lessonId);
    return;
  }

  const paths = Array.from({ length: count }, (_, i) => getChunkPath(lessonId, i));

  await supabase.storage.from("course-videos").remove(paths);

  await supabase
    .from("lessons")
    .update({ video_path: null, video_chunk_count: 0 })
    .eq("id", lessonId);
}

// services/teacherCourses.ts
export async function uploadLessonVideoBunny(
  lessonId: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<string> {
  const { data, error } = await supabase.functions.invoke(
    "create-bunny-video",
    { body: { lessonId, title: file.name } }
  );

  if (error) {
    let details = error.message ?? "خطأ غير معروف";

    if (error.context) {
      try {
        const errorBody = await error.context.json();
        console.error("Edge function error body:", errorBody);
        details = errorBody.error ?? JSON.stringify(errorBody);
      } catch {
        try {
          const errorText = await error.context.text();
          console.error("Edge function error text:", errorText);
          details = errorText;
        } catch {
          // مفيش تفاصيل إضافية متاحة
        }
      }
    }

    throw new Error(`فشل إنشاء الفيديو: ${details}`);
  }

  if (data?.error) {
    // الفنكشن نفسها رجعت { error: "..." } برسالة 500
    throw new Error(`خطأ من الخادم: ${data.error}`);
  }

  if (!data?.videoId) {
    throw new Error(`رد غير متوقع من الخادم: ${JSON.stringify(data)}`);
  }

  const { videoId, libraryId, expiration, signature, tusEndpoint } = data;


  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: tusEndpoint,
      retryDelays: [0, 3000, 5000, 10000],
      headers: {
        AuthorizationSignature: signature,
        AuthorizationExpire: String(expiration),
        VideoId: videoId,
        LibraryId: String(libraryId),
      },
      metadata: { filetype: file.type, title: file.name },
      onProgress: (uploaded, total) => {
        onProgress(Math.round((uploaded / total) * 100));
      },
      onSuccess: () => resolve(),
      onError: reject,
    });

    upload.start();
  });

  // اربط الـ videoId بالدرس في قاعدة البيانات
  const { error: updateError } = await supabase
    .from("lessons")
    .update({
      bunny_video_id: videoId,
      bunny_video_status: "processing",
    })
    .eq("id", lessonId);

  if (updateError) throw updateError;

  return videoId;
}

export async function deleteLessonVideoBunny(lessonId: string) {
  const { data: lesson, error: fetchError } = await supabase
    .from("lessons")
    .select("bunny_video_id")
    .eq("id", lessonId)
    .single();

  if (fetchError) throw fetchError;

  if (lesson?.bunny_video_id) {
    const { error } = await supabase.functions.invoke("delete-bunny-video", {
      body: { videoId: lesson.bunny_video_id },
    });
    if (error) throw error;
  }

  const { error: updateError } = await supabase
    .from("lessons")
    .update({ bunny_video_id: null, bunny_video_status: "pending" })
    .eq("id", lessonId);

  if (updateError) throw updateError;
}