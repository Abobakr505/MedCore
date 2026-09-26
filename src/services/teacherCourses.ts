
// services/teacherCourses.ts

import {
  supabase,
  supabaseUrl,
  supabaseAnonKey,
} from "@/lib/supabase";

import { slugify } from "@/utils/format";
import type {
  Course,
  CourseSection,
  Lesson,
} from "@/types";

import {
  splitFileIntoChunks,
  getChunkPath,
} from "@/utils/videoChunking";

// =====================================================
// COURSES
// =====================================================

export async function fetchTeacherCourses(
  teacherId: string
) {
  const {
    data: courses,
    error,
  } = await supabase
    .from("courses")
    .select("*")
    .eq("teacher_id", teacherId)
    .order("created_at", {
      ascending: false,
    });

  if (error) throw error;

  const list = (courses ?? []) as Course[];

  if (list.length === 0) {
    return list;
  }

  const courseIds = list.map(
    (course) => course.id
  );

  const {
    data: enrollments,
    error: enrollError,
  } = await supabase
    .from("enrollments")
    .select("course_id")
    .in("course_id", courseIds)
    .eq("status", "active");

  if (enrollError) throw enrollError;

  const countsMap = new Map<string, number>();

  for (const row of enrollments ?? []) {
    countsMap.set(
      row.course_id,
      (countsMap.get(row.course_id) ?? 0) + 1
    );
  }

  return list.map((course) => ({
    ...course,
    students_count:
      countsMap.get(course.id) ?? 0,
  })) as Course[];
}

export async function createCourse(params: {
  teacherId: string;
  title: string;
  description: string;
  college: string;
  price: number;
}) {
  const slug = `${slugify(
    params.title
  )}-${Date.now().toString(36)}`;

  const {
    data,
    error,
  } = await supabase
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

export async function updateCourse(
  courseId: string,
  updates: Partial<Course>
) {
  const { error } = await supabase
    .from("courses")
    .update(updates)
    .eq("id", courseId);

  if (error) throw error;
}

export async function togglePublish(
  courseId: string,
  publish: boolean
) {
  const { error } = await supabase
    .from("courses")
    .update({
      is_published: publish,
      status: publish
        ? "published"
        : "draft",
    })
    .eq("id", courseId);

  if (error) throw error;
}

export async function deleteCourse(
  courseId: string
) {
  const { error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId);

  if (error) throw error;
}

export async function uploadThumbnail(
  courseId: string,
  file: File
) {
  const ext = file.name
    .split(".")
    .pop();

  const path = `${courseId}/thumbnail.${ext}`;

  const { error } = await supabase.storage
    .from("course-thumbnails")
    .upload(path, file, {
      upsert: true,
    });

  if (error) throw error;

  await updateCourse(courseId, {
    thumbnail_path: path,
  });

  return path;
}

// =====================================================
// SECTIONS
// =====================================================

export async function fetchSections(
  courseId: string
) {
  const {
    data,
    error,
  } = await supabase
    .from("course_sections")
    .select("*, lessons(*)")
    .eq("course_id", courseId)
    .order("order_index");

  if (error) throw error;

  return (data ??
    []) as unknown as CourseSection[];
}

export async function createSection(
  courseId: string,
  title: string,
  orderIndex: number
) {
  const {
    data,
    error,
  } = await supabase
    .from("course_sections")
    .insert({
      course_id: courseId,
      title,
      order_index: orderIndex,
    })
    .select()
    .single();

  if (error) throw error;

  return data as CourseSection;
}

export async function deleteSection(
  sectionId: string
) {
  const { error } = await supabase
    .from("course_sections")
    .delete()
    .eq("id", sectionId);

  if (error) throw error;
}

export async function updateSectionTitle(
  sectionId: string,
  title: string
) {
  const { error } = await supabase
    .from("course_sections")
    .update({ title })
    .eq("id", sectionId);

  if (error) throw error;
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
    throw new Error(
      "Section ID is required"
    );
  }

  const payload: Record<
    string,
    unknown
  > = {};

  if (updates.title !== undefined) {
    payload.title = updates.title;
  }

  if (
    updates.description !==
    undefined
  ) {
    payload.description =
      updates.description;
  }

  if (
    updates.orderIndex !==
    undefined
  ) {
    payload.order_index =
      updates.orderIndex;
  }

  if (
    updates.unlockMonth !==
    undefined
  ) {
    payload.unlock_month = Math.max(
      1,
      Math.floor(
        updates.unlockMonth
      )
    );
  }

  const {
    data,
    error,
  } = await supabase
    .from("course_sections")
    .update(payload)
    .eq("id", sectionId)
    .select()
    .single();

  if (error) {
    console.error(
      "updateSection error:",
      error
    );

    throw error;
  }

  return data;
}

// =====================================================
// LESSONS
// =====================================================

export async function createLesson(params: {
  sectionId: string;
  title: string;
  description: string;
  orderIndex: number;
  isPreview: boolean;
}) {
  const {
    data,
    error,
  } = await supabase
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

export async function deleteLesson(
  lessonId: string
) {
  const { error } = await supabase
    .from("lessons")
    .delete()
    .eq("id", lessonId);

  if (error) throw error;
}

export async function reorderLessons(
  updates: {
    id: string;
    order_index: number;
  }[]
) {
  await Promise.all(
    updates.map((u) =>
      supabase
        .from("lessons")
        .update({
          order_index:
            u.order_index,
        })
        .eq("id", u.id)
    )
  );
}

export async function setPreview(
  lessonId: string,
  isPreview: boolean
) {
  const { error } = await supabase
    .from("lessons")
    .update({
      is_preview: isPreview,
    })
    .eq("id", lessonId);

  if (error) throw error;
}

export async function updateLessonTitle(
  lessonId: string,
  title: string
) {
  const { error } = await supabase
    .from("lessons")
    .update({ title })
    .eq("id", lessonId);

  if (error) throw error;
}

export async function updateLessonDescription(
  lessonId: string,
  description: string
) {
  const { error } = await supabase
    .from("lessons")
    .update({ description })
    .eq("id", lessonId);

  if (error) throw error;
}

// =====================================================
// OLD STORAGE VIDEO UPLOAD
// =====================================================

export async function uploadLessonVideo(
  courseId: string,
  lessonId: string,
  file: File,
  onProgress?: (
    pct: number
  ) => void
) {
  if (!(file instanceof File)) {
    throw new Error(
      "الملف المرفوع غير صالح"
    );
  }

  if (!file.size) {
    throw new Error(
      "الفيديو فارغ"
    );
  }

  const originalExt = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  const allowedExtensions = [
    "mp4",
    "webm",
    "mov",
    "m4v",
  ];

  if (
    !originalExt ||
    !allowedExtensions.includes(
      originalExt
    )
  ) {
    throw new Error(
      "صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV"
    );
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
    }[ext] ??
      "application/octet-stream");

  const {
    error: uploadError,
  } = await supabase.storage
    .from("course-videos")
    .upload(path, file, {
      upsert: true,
      contentType,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(
      `فشل رفع الفيديو: ${uploadError.message}`
    );
  }

  onProgress?.(100);

  await updateLessonVideoPath(
    lessonId,
    path
  );

  return path;
}

export async function updateLessonVideoPath(
  lessonId: string,
  path: string
) {
  const { error } = await supabase
    .from("lessons")
    .update({
      video_path: path,
    })
    .eq("id", lessonId);

  if (error) {
    await supabase.storage
      .from("course-videos")
      .remove([path]);

    throw new Error(
      `تم رفع الفيديو لكن تعذر ربطه بالدرس: ${error.message}`
    );
  }
}

export async function deleteLessonVideo(
  lessonId: string,
  videoPath: string
) {
  const {
    error: storageError,
  } = await supabase.storage
    .from("course-videos")
    .remove([videoPath]);

  if (storageError) {
    throw new Error(
      `تعذّر حذف الفيديو من التخزين: ${storageError.message}`
    );
  }

  const {
    error: dbError,
  } = await supabase
    .from("lessons")
    .update({
      video_path: null,
    })
    .eq("id", lessonId);

  if (dbError) {
    throw new Error(
      `تم حذف الملف لكن تعذر تحديث الدرس: ${dbError.message}`
    );
  }
}

// =====================================================
// COURSE / LESSON HELPERS
// =====================================================

export async function fetchCourseBySlugOrId(
  value: string
) {
  const cleanValue =
    value?.trim();

  if (!cleanValue) {
    throw new Error(
      "Course slug or ID is required"
    );
  }

  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  let query = supabase
    .from("courses")
    .select("*");

  if (uuidRegex.test(cleanValue)) {
    query = query.eq(
      "id",
      cleanValue
    );
  } else {
    query = query.eq(
      "slug",
      cleanValue
    );
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
    fileName
      .split(".")
      .pop()
      ?.toLowerCase() || "mp4";

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
    throw new Error(
      "Lesson ID is required"
    );
  }

  const payload: Record<
    string,
    unknown
  > = {};

  if (updates.title !== undefined) {
    payload.title =
      updates.title;
  }

  if (
    updates.description !==
    undefined
  ) {
    payload.description =
      updates.description;
  }

  if (
    updates.orderIndex !==
    undefined
  ) {
    payload.order_index =
      updates.orderIndex;
  }

  if (
    updates.isPreview !==
    undefined
  ) {
    payload.is_preview =
      updates.isPreview;
  }

  if (
    updates.videoPath !==
    undefined
  ) {
    payload.video_path =
      updates.videoPath;
  }

  if (
    updates.durationSeconds !==
    undefined
  ) {
    payload.duration_seconds =
      Math.max(
        0,
        Math.round(
          updates.durationSeconds
        )
      );
  }

  const {
    data,
    error,
  } = await supabase
    .from("lessons")
    .update(payload)
    .eq("id", lessonId)
    .select()
    .single();

  if (error) {
    console.error(
      "updateLesson error:",
      error
    );

    throw error;
  }

  return data;
}

// =====================================================
// CHUNKED STORAGE UPLOAD
// =====================================================

function uploadChunkWithProgress(
  bucket: string,
  path: string,
  chunk: Blob,
  contentType: string,
  accessToken: string,
  onChunkLoaded: (
    loadedBytes: number
  ) => void
): Promise<void> {
  return new Promise(
    (resolve, reject) => {
      const xhr =
        new XMLHttpRequest();

      const url =
        `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;

      xhr.open(
        "POST",
        url,
        true
      );

      xhr.setRequestHeader(
        "Authorization",
        `Bearer ${accessToken}`
      );

      xhr.setRequestHeader(
        "apikey",
        supabaseAnonKey
      );

      xhr.setRequestHeader(
        "Content-Type",
        contentType
      );

      xhr.setRequestHeader(
        "x-upsert",
        "true"
      );

      xhr.setRequestHeader(
        "cache-control",
        "3600"
      );

      xhr.upload.onprogress = (
        event
      ) => {
        if (
          event.lengthComputable
        ) {
          onChunkLoaded(
            event.loaded
          );
        }
      };

      xhr.onload = () => {
        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          resolve();
          return;
        }

        let message =
          xhr.responseText ||
          `HTTP ${xhr.status}`;

        try {
          const parsed =
            JSON.parse(
              xhr.responseText
            );

          message =
            parsed.message ||
            parsed.error ||
            message;
        } catch {
          // استخدم النص الخام
        }

        reject(
          new Error(message)
        );
      };

      xhr.onerror = () => {
        reject(
          new Error(
            "فشل الاتصال أثناء رفع الفيديو"
          )
        );
      };

      xhr.onabort = () => {
        reject(
          new Error(
            "تم إلغاء رفع الفيديو"
          )
        );
      };

      xhr.send(chunk);
    }
  );
}

export async function uploadLessonVideoChunked(
  lessonId: string,
  file: File,
  onProgress?: (
    pct: number
  ) => void
) {
  if (
    !(file instanceof File) ||
    !file.size
  ) {
    throw new Error(
      "الملف غير صالح"
    );
  }

  const {
    data: { session },
  } =
    await supabase.auth.getSession();

  const accessToken =
    session?.access_token;

  if (!accessToken) {
    throw new Error(
      "انتهت الجلسة، برجاء تسجيل الدخول مرة أخرى"
    );
  }

  const chunks =
    splitFileIntoChunks(file);

  const contentType =
    file.type ||
    "video/mp4";

  const totalBytes =
    file.size;

  await deleteLessonVideoChunks(
    lessonId
  );

  let completedBytes = 0;

  for (
    let i = 0;
    i < chunks.length;
    i++
  ) {
    const chunk =
      chunks[i];

    const path =
      getChunkPath(
        lessonId,
        i
      );

    const chunkOffset =
      completedBytes;

    try {
      await uploadChunkWithProgress(
        "course-videos",
        path,
        chunk,
        contentType,
        accessToken,
        (loadedInChunk) => {
          const overallLoaded =
            chunkOffset +
            loadedInChunk;

          const pct =
            Math.min(
              100,
              Math.round(
                (overallLoaded /
                  totalBytes) *
                  100
              )
            );

          onProgress?.(pct);
        }
      );
    } catch (err) {
      throw new Error(
        `فشل رفع الجزء ${
          i + 1
        }: ${
          err instanceof Error
            ? err.message
            : "خطأ غير معروف"
        }`
      );
    }

    completedBytes +=
      chunk.size;

    const pct =
      Math.min(
        100,
        Math.round(
          (completedBytes /
            totalBytes) *
            100
        )
      );

    onProgress?.(pct);
  }

  const {
    error: dbError,
  } = await supabase
    .from("lessons")
    .update({
      video_path:
        `${lessonId}/`,
      video_chunk_count:
        chunks.length,
    })
    .eq("id", lessonId);

  if (dbError) {
    throw new Error(
      `تم رفع الفيديو لكن تعذر ربطه بالدرس: ${dbError.message}`
    );
  }
}

export async function deleteLessonVideoChunks(
  lessonId: string
) {
  const {
    data: existing,
  } = await supabase
    .from("lessons")
    .select(
      "video_chunk_count"
    )
    .eq("id", lessonId)
    .maybeSingle();

  const count =
    existing?.video_chunk_count ??
    0;

  if (!count) {
    await supabase
      .from("lessons")
      .update({
        video_path: null,
        video_chunk_count: 0,
      })
      .eq("id", lessonId);

    return;
  }

  const paths =
    Array.from(
      {
        length: count,
      },
      (_, i) =>
        getChunkPath(
          lessonId,
          i
        )
    );

  await supabase.storage
    .from("course-videos")
    .remove(paths);

  await supabase
    .from("lessons")
    .update({
      video_path: null,
      video_chunk_count: 0,
    })
    .eq("id", lessonId);
}

// =====================================================
// VDOCIPHER UPLOAD
// =====================================================

export interface VdoCipherCreateResponse {
  success: boolean;
  videoId: string;
  uploadUrl: string;
  uploadParameters: Record<
    string,
    string
  >;
}

/**
 * رفع فيديو إلى VdoCipher
 *
 * الخطوات:
 *
 * 1. إنشاء Video على VdoCipher
 *    عن طريق Edge Function.
 *
 * 2. الحصول على:
 *    videoId
 *    uploadUrl
 *    uploadParameters
 *
 * 3. رفع الملف مباشرة من المتصفح
 *    إلى VdoCipher S3.
 *
 * 4. حفظ videoId داخل lesson.
 */
export async function uploadLessonVideoVdoCipher(
  lessonId: string,
  file: File,
  onProgress?: (
    pct: number
  ) => void
): Promise<void> {
  // ==========================================
  // Validation
  // ==========================================

  if (!lessonId) {
    throw new Error(
      "Lesson ID غير موجود"
    );
  }

  if (
    !(file instanceof File) ||
    !file.size
  ) {
    throw new Error(
      "ملف الفيديو غير صالح أو فارغ"
    );
  }

  const allowedExtensions = [
    "mp4",
    "webm",
    "mov",
    "m4v",
  ];

  const extension = file.name
    .split(".")
    .pop()
    ?.toLowerCase();

  if (
    !extension ||
    !allowedExtensions.includes(
      extension
    )
  ) {
    throw new Error(
      "صيغة الفيديو غير مدعومة. استخدم MP4 أو WebM أو MOV"
    );
  }

  console.log(
    "Creating VdoCipher video...",
    {
      lessonId,
      title: file.name,
      size: file.size,
      type: file.type,
    }
  );

  onProgress?.(0);

  // ==========================================
  // 1. Create video on VdoCipher
  // ==========================================

  const {
    data: createData,
    error: createError,
  } =
    await supabase.functions.invoke(
      "create-vdocipher-video",
      {
        body: {
          lessonId,
          title: file.name,
        },
      }
    );

  console.log(
    "VdoCipher create response:",
    createData
  );

  if (createError) {
    console.error(
      "VdoCipher create error:",
      createError
    );

    throw new Error(
      `فشل إنشاء الفيديو على VdoCipher: ${
        createError.message ||
        "خطأ غير معروف"
      }`
    );
  }

  if (!createData) {
    throw new Error(
      "لم ترجع Edge Function أي بيانات"
    );
  }

  // ==========================================
  // 2. Validate videoId
  // ==========================================

  if (!createData.videoId) {
    console.error(
      "Missing VdoCipher videoId:",
      createData
    );

    throw new Error(
      `VdoCipher لم يرجع videoId: ${JSON.stringify(
        createData
      )}`
    );
  }

  // ==========================================
  // 3. Validate uploadUrl
  // ==========================================

  if (!createData.uploadUrl) {
    console.error(
      "Missing VdoCipher uploadUrl:",
      createData
    );

    throw new Error(
      `VdoCipher لم يرجع uploadUrl: ${JSON.stringify(
        createData
      )}`
    );
  }

  // ==========================================
  // 4. Validate uploadParameters
  // ==========================================

  if (
    !createData.uploadParameters ||
    typeof createData.uploadParameters !==
      "object"
  ) {
    console.error(
      "Missing VdoCipher uploadParameters:",
      createData
    );

    throw new Error(
      "VdoCipher لم يرجع بيانات الرفع المطلوبة"
    );
  }

  const {
    videoId,
    uploadUrl,
    uploadParameters,
  } =
    createData as VdoCipherCreateResponse;

  console.log(
    "VdoCipher video created:",
    videoId
  );

  console.log(
    "VdoCipher upload URL:",
    uploadUrl
  );

  // ==========================================
  // 5. Build FormData
  // ==========================================

  const formData =
    new FormData();

  // ------------------------------------------
  // VdoCipher / AWS credentials
  // ------------------------------------------

  Object.entries(
    uploadParameters
  ).forEach(
    ([key, value]) => {
      formData.append(
        key,
        String(value)
      );
    }
  );

  // ------------------------------------------
  // REQUIRED BY VDOCIPHER UPLOAD POLICY
  // ------------------------------------------

  formData.append(
    "success_action_status",
    "201"
  );

  formData.append(
    "success_action_redirect",
    ""
  );

  // ------------------------------------------
  // IMPORTANT:
  // file MUST be appended LAST
  // ------------------------------------------

  formData.append(
    "file",
    file
  );

  // ==========================================
  // 6. Upload directly to VdoCipher
  // ==========================================

  console.log(
    "Starting direct upload to VdoCipher..."
  );

  await new Promise<void>(
    (resolve, reject) => {
      const xhr =
        new XMLHttpRequest();

      xhr.open(
        "POST",
        uploadUrl,
        true
      );

      // ----------------------------------------
      // IMPORTANT:
      // Do NOT manually set Content-Type.
      //
      // Browser automatically generates:
      //
      // multipart/form-data;
      // boundary=...
      // ----------------------------------------

      // ----------------------------------------
      // Upload progress
      // ----------------------------------------

      xhr.upload.onprogress =
        (event) => {
          if (
            event.lengthComputable
          ) {
            const percent =
              Math.round(
                (event.loaded /
                  event.total) *
                  100
              );

            onProgress?.(
              percent
            );

            console.log(
              `VdoCipher upload: ${percent}%`
            );
          }
        };

      // ----------------------------------------
      // Response
      // ----------------------------------------

      xhr.onload = () => {
        console.log(
          "VdoCipher upload finished",
          {
            status:
              xhr.status,
            response:
              xhr.responseText,
          }
        );

        if (
          xhr.status >= 200 &&
          xhr.status < 300
        ) {
          onProgress?.(100);

          resolve();
          return;
        }

        reject(
          new Error(
            `فشل رفع الفيديو إلى VdoCipher (HTTP ${
              xhr.status
            }): ${
              xhr.responseText ||
              "Unknown error"
            }`
          )
        );
      };

      // ----------------------------------------
      // Network error
      // ----------------------------------------

      xhr.onerror = () => {
        reject(
          new Error(
            "فشل الاتصال بـ VdoCipher أثناء رفع الفيديو"
          )
        );
      };

      // ----------------------------------------
      // Abort
      // ----------------------------------------

      xhr.onabort = () => {
        reject(
          new Error(
            "تم إلغاء رفع الفيديو"
          )
        );
      };

      // ----------------------------------------
      // Timeout
      // ----------------------------------------

      xhr.ontimeout = () => {
        reject(
          new Error(
            "انتهت مهلة رفع الفيديو"
          )
        );
      };

      // ----------------------------------------
      // Send
      // ----------------------------------------

      xhr.send(formData);
    }
  );

  // ==========================================
  // 7. Save VdoCipher video ID in lesson
  // ==========================================

  console.log(
    "Saving VdoCipher video ID to lesson..."
  );

  const {
    error: updateError,
  } = await supabase
    .from("lessons")
    .update({
      vdocipher_video_id:
        videoId,
    })
    .eq(
      "id",
      lessonId
    );

  if (updateError) {
    console.error(
      "Failed to save VdoCipher video ID:",
      updateError
    );

    throw new Error(
      `تم رفع الفيديو إلى VdoCipher لكن تعذر ربطه بالدرس: ${updateError.message}`
    );
  }

  // ==========================================
  // Done
  // ==========================================

  onProgress?.(100);

  console.log(
    "================================="
  );

  console.log(
    "VdoCipher video uploaded successfully"
  );

  console.log(
    "videoId:",
    videoId
  );

  console.log(
    "================================="
  );
}

// =====================================================
// DELETE VDOCIPHER VIDEO
// =====================================================

export async function deleteLessonVideoVdoCipher(
  lessonId: string
): Promise<void> {
  if (!lessonId) {
    throw new Error(
      "Lesson ID غير موجود"
    );
  }

  const {
    data: lesson,
    error: fetchError,
  } =
    await supabase
      .from("lessons")
      .select(
        "vdocipher_video_id"
      )
      .eq(
        "id",
        lessonId
      )
      .single();

  if (fetchError) {
    throw fetchError;
  }

  const videoId =
    lesson?.vdocipher_video_id;

  if (videoId) {
    const {
      error: deleteError,
    } =
      await supabase.functions.invoke(
        "delete-vdocipher-video",
        {
          body: {
            videoId,
          },
        }
      );

    if (deleteError) {
      throw deleteError;
    }
  }

  const {
    error: updateError,
  } =
    await supabase
      .from("lessons")
      .update({
        vdocipher_video_id:
          null,
      })
      .eq(
        "id",
        lessonId
      );

  if (updateError) {
    throw updateError;
  }
}

// =====================================================
// BACKWARD COMPATIBILITY
// =====================================================

/**
 * الاسم القديم المستخدم في بعض أجزاء Course Builder.
 *
 * نبقيه حتى لا تتكسر الملفات القديمة.
 */
export const uploadLessonVideoBunny =
  uploadLessonVideoVdoCipher;

