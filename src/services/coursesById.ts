import { supabase } from "@/lib/supabase";
import type { Course } from "@/types";

/** يجلب كورسًا بالـ id (وليس الـ slug) — يُستخدم داخل لوحات التحكم حيث نتعامل مع id مباشرة */
export async function fetchCourseBySlugOrId(id: string) {
  const { data, error } = await supabase
    .from("courses")
    .select("*, teacher:profiles!courses_teacher_id_fkey(id, full_name, avatar_url)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as Course;
}
