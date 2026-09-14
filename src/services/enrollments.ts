import { supabase } from "@/lib/supabase";
import type { Enrollment, LessonProgress } from "@/types";

export async function fetchStudentEnrollments(studentId: string) {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, course:courses(*, teacher:profiles!courses_teacher_id_fkey(full_name))")
    .eq("student_id", studentId)
    .eq("status", "active")
    .order("enrolled_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Enrollment[];
}

export async function fetchAllEnrollments() {
  const { data, error } = await supabase
    .from("enrollments")
    .select("*, course:courses(title), student:profiles(full_name, email)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as unknown as (Enrollment & { student: { full_name: string; email: string } })[];
}

export async function fetchLessonProgress(studentId: string, lessonIds: string[]) {
  if (lessonIds.length === 0) return [];
  const { data, error } = await supabase
    .from("lesson_progress")
    .select("*")
    .eq("student_id", studentId)
    .in("lesson_id", lessonIds);
  if (error) throw error;
  return (data ?? []) as LessonProgress[];
}

export async function upsertLessonProgress(params: {
  studentId: string;
  lessonId: string;
  progressSeconds: number;
  completed: boolean;
}) {
  const { studentId, lessonId, progressSeconds, completed } = params;
  const { error } = await supabase.from("lesson_progress").upsert(
    {
      student_id: studentId,
      lesson_id: lessonId,
      progress_seconds: progressSeconds,
      completed,
      last_watched_at: new Date().toISOString(),
    },
    { onConflict: "student_id,lesson_id" }
  );
  if (error) throw error;
}

/** يحسب نسبة تقدّم الطالب في كورس معيّن بناءً على الدروس المكتملة */
export function computeCourseProgress(totalLessons: number, completedLessons: number): number {
  if (totalLessons === 0) return 0;
  return Math.round((completedLessons / totalLessons) * 100);
}
