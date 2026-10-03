import { supabase } from "@/lib/supabase";
import type { Profile, UserDevice } from "@/types";
import { deleteCourseVideosVdoCipher } from "@/services/teacherCourses";

export async function fetchUsersByRole(role: "student" | "teacher") {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", role)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Profile[];
}

export async function updateUserStatus(userId: string, status: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ status })
    .eq("id", userId);
  if (error) throw error;
}

/* ------------------------------------------------------------------ */
/* إدارة أمان المستخدمين (تغيير كلمة السر / الحذف النهائي)             */
/* تتم عبر Edge Function لأنها تحتاج Service Role Key                  */
/* ------------------------------------------------------------------ */

async function invokeAdminAction(body: {
  action: "set_password" | "delete_user";
  userId: string;
  password?: string;
}) {
  const { data, error } = await supabase.functions.invoke(
    "admin-manage-user",
    { body }
  );

  if (error) {
    let message = "حدث خطأ غير متوقع";
    try {
      const res = await (error as any).context?.json?.();
      if (res?.error) message = res.error;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  if (data?.error) throw new Error(data.error);

  return data;
}

export async function adminSetUserPassword(userId: string, password: string) {
  return invokeAdminAction({ action: "set_password", userId, password });
}

export async function adminDeleteUser(
  userId: string,
  role?: "student" | "teacher"
) {
  // المعلم: احذف فيديوهات كورساته من VdoCipher أولاً لتجنب فيديوهات يتيمة.
  // لو فشل الحذف سيرمي Error ولن يُحذف الحساب.
  if (role === "teacher") {
    const { data: courses, error } = await supabase
      .from("courses")
      .select("id")
      .eq("teacher_id", userId);
    if (error) throw error;

    for (const c of courses ?? []) {
      await deleteCourseVideosVdoCipher(c.id);
    }
  }

  return invokeAdminAction({ action: "delete_user", userId });
}

/* ------------------------------------------------------------------ */

export async function fetchAllCoursesAdmin() {
  const { data, error } = await supabase
    .from("courses")
    .select("*, teacher:profiles!courses_teacher_id_fkey(full_name)")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const list = data ?? [];
  if (list.length === 0) return list;

  // عدّ دقيق لكل كورس من enrollments (بدون حد الـ 1000 صف)
  const counts = await Promise.all(
    list.map(async (course: any) => {
      const { count } = await supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("course_id", course.id)
        .eq("status", "active");
      return count ?? 0;
    })
  );

  return list.map((course: any, i: number) => ({
    ...course,
    students_count: counts[i],
  }));
}

export async function adminDeleteCourse(courseId: string) {
  // 1) احذف كل فيديوهات الكورس من VdoCipher أولاً.
  //    لو فشل الحذف هيرمي Error ولن يتم حذف الكورس (عشان ما يفضلش فيديوهات يتيمة).
  await deleteCourseVideosVdoCipher(courseId);

  // 2) احذف الكورس من قاعدة البيانات
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
  const { error } = await supabase.rpc("admin_reset_device", {
    p_user_id: userId,
  });
  if (error) throw error;
}

export async function fetchPlatformSettings() {
  const { data, error } = await supabase.from("platform_settings").select("*");
  if (error) throw error;
  return data ?? [];
}

export async function updatePlatformSetting(key: string, value: unknown) {
  const { error } = await supabase
    .from("platform_settings")
    .update({ value })
    .eq("key", key);
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
  const [students, teachers, courses, payments, enrollments] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "student"),
      supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "teacher"),
      supabase.from("courses").select("id", { count: "exact", head: true }),
      supabase.from("payments").select("amount, status"),
      supabase
        .from("enrollments")
        .select("id", { count: "exact", head: true })
        .eq("status", "active"),
    ]);

  const approvedPayments = (payments.data ?? []).filter(
    (p: any) => p.status === "approved"
  );
  const pendingCount = (payments.data ?? []).filter(
    (p: any) => p.status === "pending"
  ).length;
  const revenue = approvedPayments.reduce(
    (sum: number, p: any) => sum + Number(p.amount),
    0
  );

  return {
    studentsCount: students.count ?? 0,
    teachersCount: teachers.count ?? 0,
    coursesCount: courses.count ?? 0,
    revenue,
    pendingPayments: pendingCount,
    activeEnrollments: enrollments.count ?? 0,
  };
}

export interface MonthlyStat {
  month: string;
  users: number;
  revenue: number;
}

export interface TeacherPerformance {
  name: string;
  students: number;
  revenue: number;
}

const ARABIC_MONTHS = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

function lastNMonthsKeys(n: number) {
  const keys: { key: string; label: string }[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    keys.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: ARABIC_MONTHS[d.getMonth()],
    });
  }
  return keys;
}

export async function fetchMonthlyGrowth(months = 6): Promise<MonthlyStat[]> {
  const buckets = lastNMonthsKeys(months);
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - (months - 1));
  fromDate.setDate(1);

  const [
    { data: users, error: usersErr },
    { data: payments, error: paymentsErr },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("created_at")
      .gte("created_at", fromDate.toISOString()),
    supabase
      .from("payments")
      .select("created_at, amount, status")
      .eq("status", "approved")
      .gte("created_at", fromDate.toISOString()),
  ]);

  if (usersErr) throw usersErr;
  if (paymentsErr) throw paymentsErr;

  const usersMap = new Map<string, number>();
  const revenueMap = new Map<string, number>();

  (users ?? []).forEach((u: any) => {
    const d = new Date(u.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    usersMap.set(key, (usersMap.get(key) ?? 0) + 1);
  });

  (payments ?? []).forEach((p: any) => {
    const d = new Date(p.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    revenueMap.set(key, (revenueMap.get(key) ?? 0) + Number(p.amount));
  });

  return buckets.map(({ key, label }) => ({
    month: label,
    users: usersMap.get(key) ?? 0,
    revenue: revenueMap.get(key) ?? 0,
  }));
}

export async function fetchTeacherPerformance(
  limit = 6
): Promise<TeacherPerformance[]> {
  const { data: courses, error } = await supabase
    .from("courses")
    .select(
      "students_count, price, teacher:profiles!courses_teacher_id_fkey(full_name)"
    );

  if (error) throw error;

  const map = new Map<string, { students: number; revenue: number }>();

  (courses ?? []).forEach((c: any) => {
    const teacherName = c.teacher?.full_name ?? "غير معروف";
    const current = map.get(teacherName) ?? { students: 0, revenue: 0 };
    current.students += c.students_count ?? 0;
    current.revenue += (c.students_count ?? 0) * (c.price ?? 0);
    map.set(teacherName, current);
  });

  return Array.from(map.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

export async function fetchTeacherSubscriberCounts(): Promise<
  Record<string, number>
> {
  const courses = await fetchAllCoursesAdmin();

  const counts: Record<string, number> = {};
  for (const c of courses as any[]) {
    counts[c.teacher_id] = (counts[c.teacher_id] ?? 0) + (c.students_count ?? 0);
  }
  return counts;
}