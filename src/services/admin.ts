import { supabase } from "@/lib/supabase";
import type { Profile, UserDevice } from "@/types";

export async function fetchUsersByRole(role: "student" | "teacher") {
  const { data, error } = await supabase.from("profiles").select("*").eq("role", role).order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateUserStatus(userId: string, status: string) {
  const { error } = await supabase.from("profiles").update({ status }).eq("id", userId);
  if (error) throw error;
}

export async function fetchAllCoursesAdmin() {
  const { data, error } = await supabase
    .from("courses")
    .select("*, teacher:profiles!courses_teacher_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function adminDeleteCourse(courseId: string) {
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) throw error;
}

export async function fetchAllDevices() {
  const { data, error } = await supabase
    .from("user_devices")
    .select("*, user:profiles(full_name, email)")
    .eq("is_active", true)
    .order("last_seen_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as UserDevice[];
}

export async function resetUserDevice(userId: string) {
  const { error } = await supabase.rpc("admin_reset_device", { p_user_id: userId });
  if (error) throw error;
}

export async function fetchPlatformSettings() {
  const { data, error } = await supabase.from("platform_settings").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function updatePlatformSetting(key: string, value: unknown) {
  const { error } = await supabase.from("platform_settings").update({ value }).eq("key", key);
  if (error) throw error;
}

export interface DashboardStats {
  studentsCount: number;
  teachersCount: number;
  coursesCount: number;
  revenue: number;
  pendingPayments: number;
  activeEnrollments: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const [students, teachers, courses, payments, enrollments] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "student"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "teacher"),
    supabase.from("courses").select("id", { count: "exact", head: true }),
    supabase.from("payments").select("amount, status"),
    supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("status", "active"),
  ]);

  const approvedPayments = (payments.data ?? []).filter((p: any) => p.status === "approved");
  const pendingCount = (payments.data ?? []).filter((p: any) => p.status === "pending").length;
  const revenue = approvedPayments.reduce((sum: number, p: any) => sum + Number(p.amount), 0);

  return {
    studentsCount: students.count ?? 0,
    teachersCount: teachers.count ?? 0,
    coursesCount: courses.count ?? 0,
    revenue,
    pendingPayments: pendingCount,
    activeEnrollments: enrollments.count ?? 0,
  };
}
