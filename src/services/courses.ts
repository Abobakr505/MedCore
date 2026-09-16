import { supabase } from "@/lib/supabase";
import type { Course, CourseSection } from "@/types";

/* =========================================================
   Types
========================================================= */

export interface CourseFilters {
  search?: string;
  college?: string;
  teacherId?: string;
  sort?:
    | "newest"
    | "oldest"
    | "price_asc"
    | "price_desc"
    | "popular"
    | "rating";
  page?: number;
  pageSize?: number;
}

export interface LessonFile {
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

/* =========================================================
   Fetch Courses
========================================================= */

/* =========================================================
   Fetch Courses
========================================================= */

export async function fetchCourses(filters: CourseFilters = {}) {
  const {
    search,
    college,
    teacherId,
    sort = "newest",
    page = 1,
    pageSize = 12,
  } = filters;

  let query = supabase
    .from("courses")
    .select(
      `
        *,
        teacher:profiles!courses_teacher_id_fkey(
          id,
          full_name,
          avatar_url
        )
      `,
      { count: "exact" }
    )
    .eq("is_published", true);

  /* =======================================================
     Search + College
     
     الحالات:
     
     1. بدون بحث + بدون كلية
        => كل الكورسات

     2. بحث فقط
        => title OR description

     3. كلية فقط
        => selected college OR all

     4. بحث + كلية
        => (title OR description)
        AND
        (selected college OR all)
  ======================================================= */

  const cleanSearch = search?.trim();
  const cleanCollege = college?.trim();

  if (cleanSearch && cleanCollege && cleanCollege !== "all") {
    const escapedSearch = cleanSearch
      .replace(/[%_]/g, "\\$&")
      .replace(/,/g, "\\,");

    query = query.or(
      `and(title.ilike.%${escapedSearch}%,college.eq.${cleanCollege}),and(description.ilike.%${escapedSearch}%,college.eq.${cleanCollege}),and(title.ilike.%${escapedSearch}%,college.eq.all),and(description.ilike.%${escapedSearch}%,college.eq.all)`
    );
  } else if (cleanSearch) {
    const escapedSearch = cleanSearch
      .replace(/[%_]/g, "\\$&")
      .replace(/,/g, "\\,");

    query = query.or(
      `title.ilike.%${escapedSearch}%,description.ilike.%${escapedSearch}%`
    );
  } else if (cleanCollege && cleanCollege !== "all") {
    query = query.or(
      `college.eq.${cleanCollege},college.eq.all`
    );
  }

  /* =======================================================
     Teacher
  ======================================================= */

  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  /* =======================================================
     Sorting
  ======================================================= */

  switch (sort) {
    case "oldest":
      query = query.order("created_at", {
        ascending: true,
      });
      break;

    case "price_asc":
      query = query.order("price", {
        ascending: true,
      });
      break;

    case "price_desc":
      query = query.order("price", {
        ascending: false,
      });
      break;

    case "popular":
      query = query.order("students_count", {
        ascending: false,
      });
      break;

    case "rating":
      query = query.order("rating", {
        ascending: false,
      });
      break;

    case "newest":
    default:
      query = query.order("created_at", {
        ascending: false,
      });
      break;
  }

  /* =======================================================
     Pagination
  ======================================================= */

  const safePage = Math.max(1, page);
  const safePageSize = Math.max(1, pageSize);

  const from = (safePage - 1) * safePageSize;
  const to = from + safePageSize - 1;

  query = query.range(from, to);

  const {
    data,
    error,
    count,
  } = await query;

  if (error) {
    console.error("fetchCourses error:", error);
    throw error;
  }

  return {
    courses: (data ?? []) as unknown as Course[],
    total: count ?? 0,
  };
}
/* =========================================================
   Fetch Course By Slug
========================================================= */

export async function fetchCourseBySlug(slug: string) {
  const cleanSlug = slug?.trim();

  if (!cleanSlug) {
    throw new Error("Course slug is required");
  }

  const { data, error } = await supabase
    .from("courses")
    .select(`
      *,
      teacher:profiles!courses_teacher_id_fkey(
        id,
        full_name,
        avatar_url
      )
    `)
    .eq("slug", cleanSlug)
    .maybeSingle();

  if (error) {
    console.error("fetchCourseBySlug error:", error);
    throw error;
  }

  if (!data) {
    throw new Error(
      `Course not found for slug: ${cleanSlug}`
    );
  }

  return data as unknown as Course;
}

/* =========================================================
   Fetch Course Sections
   Includes Lessons + Lesson Files
========================================================= */

export async function fetchCourseSections(
  courseId: string
) {
  if (!courseId) {
    throw new Error("Course ID is required");
  }

  const {
    data,
    error,
  } = await supabase
    .from("course_sections")
    .select(
      `
        *,
        lessons (
          id,
          section_id,
          title,
          description,
          duration_seconds,
          order_index,
          is_preview,
          video_path,
          video_chunk_count,
          lesson_files (
            id,
            lesson_id,
            title,
            file_path,
            file_name,
            file_size,
            mime_type,
            order_index,
            created_at
          )
        )
      `
    )
    .eq("course_id", courseId)
    .order("order_index", {
      ascending: true,
    });

  if (error) {
    console.error(
      "fetchCourseSections error:",
      error
    );

    throw error;
  }

  /*
   * ترتيب:
   *
   * Sections
   *   ↓
   * Lessons
   *   ↓
   * Files
   */

  const sections = (data ?? []).map(
    (section: any) => {
      const lessons = (section.lessons ?? [])
        .sort(
          (a: any, b: any) =>
            (a.order_index ?? 0) -
            (b.order_index ?? 0)
        )
        .map((lesson: any) => {
          const files = (
            lesson.lesson_files ?? []
          ).sort(
            (a: any, b: any) =>
              (a.order_index ?? 0) -
              (b.order_index ?? 0)
          );

          return {
            ...lesson,

            /*
             * LearningPage يستخدم:
             *
             * lesson.files
             *
             * بدل:
             *
             * lesson.lesson_files
             */
            files,
          };
        });

      return {
        ...section,
        lessons,
      };
    }
  );

  return sections as CourseSection[];
}

/* =========================================================
   Check Student Enrollment
========================================================= */

export async function isStudentEnrolled(
  courseId: string,
  studentId: string
) {
  if (!courseId || !studentId) {
    return false;
  }

  const {
    data,
    error,
  } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .maybeSingle();

  if (error) {
    console.error(
      "isStudentEnrolled error:",
      error
    );

    throw error;
  }

  return !!data;
}

export async function fetchCourseQuizzes(courseId: string) {
  if (!courseId) {
    throw new Error("Course ID is required");
  }

  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .eq("course_id", courseId)
    .order("created_at", { ascending: true });

  if (error) {
    console.error("fetchCourseQuizzes error:", error);
    throw error;
  }

  return data ?? [];
}
export async function fetchLessonProgress(
  studentId: string,
  courseId: string
) {
  if (!studentId || !courseId) {
    return [];
  }

  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", studentId)
    .eq("course_id", courseId);

  if (error) {
    console.error(
      "fetchLessonProgress error:",
      error
    );

    throw error;
  }

  return data ?? [];
}
export async function updateLessonProgress(
  studentId: string,
  lessonId: string,
  courseId: string,
  progressPercentage: number,
  completed = false
) {
  if (!studentId || !lessonId || !courseId) {
    throw new Error("Missing lesson progress data");
  }

  const progress = Math.min(
    100,
    Math.max(0, progressPercentage)
  );

  const { data, error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        student_id: studentId,
        lesson_id: lessonId,
        course_id: courseId,
        progress_percentage: progress,
        completed,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "student_id,lesson_id",
      }
    )
    .select()
    .single();

  if (error) {
    console.error(
      "updateLessonProgress error:",
      error
    );

    throw error;
  }

  return data;
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

  const selectQuery = `
    *,
    teacher:profiles!courses_teacher_id_fkey(
      id,
      full_name,
      avatar_url
    )
  `;

  // UUID => Course ID
  if (uuidRegex.test(cleanValue)) {
    const { data, error } = await supabase
      .from("courses")
      .select(selectQuery)
      .eq("id", cleanValue)
      .maybeSingle();

    if (error) {
      console.error(
        "fetchCourseBySlugOrId by ID error:",
        error
      );
      throw error;
    }

    if (data) {
      return data as unknown as Course;
    }
  }

  // Otherwise => Course slug
  const { data, error } = await supabase
    .from("courses")
    .select(selectQuery)
    .eq("slug", cleanValue)
    .maybeSingle();

  if (error) {
    console.error(
      "fetchCourseBySlugOrId by slug error:",
      error
    );
    throw error;
  }

  if (!data) {
    throw new Error(
      `Course not found: ${cleanValue}`
    );
  }

  return data as unknown as Course;
}

/** يرجع أعلى رقم شهر تم اعتماد دفعه فعليًا لهذا الطالب في هذا الكورس (0 لو ولا شهر) */
export async function fetchUnlockedMonth(studentId: string, courseId: string) {
  if (!studentId || !courseId) return 0;

  const { data, error } = await supabase
    .from("student_installments")
    .select("month_number")
    .eq("student_id", studentId)
    .eq("course_id", courseId)
    .eq("status", "approved")
    .order("month_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("fetchUnlockedMonth error:", error);
    return 0;
  }

  // كورس غير تقسيط أو لسه مفيش أقساط approved = يعتبر مفتوح لو فيه enrollment عادي (بيتحقق بمكان تاني)
  return data?.month_number ?? 0;
}