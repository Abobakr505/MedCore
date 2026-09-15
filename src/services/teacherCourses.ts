import { supabase } from "@/lib/supabase";
import { slugify } from "@/utils/format";
import type { Course, CourseSection, Lesson } from "@/types";

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