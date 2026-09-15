import { supabase } from "@/lib/supabase";
import type { Course, CourseSection } from "@/types";

export interface CourseFilters {
  search?: string;
  college?: string;
  teacherId?: string;
  sort?: "newest" | "oldest" | "price_asc" | "price_desc" | "popular" | "rating";
  page?: number;
  pageSize?: number;
}

export async function fetchCourses(filters: CourseFilters) {
  const { search, college, teacherId, sort = "newest", page = 1, pageSize = 12 } = filters;

  let query = supabase
    .from("courses")
    .select("*, teacher:profiles!courses_teacher_id_fkey(id, full_name, avatar_url)", { count: "exact" })
    .eq("is_published", true);

  if (search) {
    query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
  }
  if (college) {
    query = query.eq("college", college);
  }
  if (teacherId) {
    query = query.eq("teacher_id", teacherId);
  }

  switch (sort) {
    case "oldest":
      query = query.order("created_at", { ascending: true });
      break;
    case "price_asc":
      query = query.order("price", { ascending: true });
      break;
    case "price_desc":
      query = query.order("price", { ascending: false });
      break;
    case "popular":
      query = query.order("students_count", { ascending: false });
      break;
    case "rating":
      query = query.order("rating", { ascending: false });
      break;
    default:
      query = query.order("created_at", { ascending: false });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, error, count } = await query;
  if (error) throw error;
  return { courses: (data ?? []) as unknown as Course[], total: count ?? 0 };
}

export async function fetchCourseBySlug(slug: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("*, teacher:profiles!courses_teacher_id_fkey(id, full_name, avatar_url)")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data as unknown as Course;
}

export async function fetchCourseSections(courseId: string) {
  const { data, error } = await supabase
    .from("course_sections")
    .select(
      "*, lessons(id, section_id, title, description, duration_seconds, order_index, is_preview, video_path)"
    )
    .eq("course_id", courseId)
    .order("order_index", { ascending: true });
  if (error) throw error;

  // ترتيب الدروس داخل كل قسم
  return (data ?? []).map((section: any) => ({
    ...section,
    lessons: (section.lessons ?? []).sort((a: any, b: any) => a.order_index - b.order_index),
  })) as CourseSection[];
}

export async function isStudentEnrolled(courseId: string, studentId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("course_id", courseId)
    .eq("student_id", studentId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}