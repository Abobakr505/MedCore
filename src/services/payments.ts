import { supabase } from "@/lib/supabase";
import type { Payment } from "@/types";

export async function uploadReceiptAndCreatePayment(params: {
  studentId: string;
  courseId: string;
  amount: number;
  file: File;
}) {
  const { studentId, courseId, amount, file } = params;
  const ext = file.name.split(".").pop();
  const path = `${studentId}/${courseId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage.from("payment-receipts").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error: insertError } = await supabase.from("payments").insert({
    student_id: studentId,
    course_id: courseId,
    amount,
    receipt_path: path,
    status: "pending",
  });
  if (insertError) throw insertError;
}

export async function fetchStudentPayments(studentId: string) {
  const { data, error } = await supabase
    .from("payments")
    .select("*, course:courses(id, title, thumbnail_path)")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Payment[];
}

export async function fetchTeacherPayments(teacherId: string, status?: string) {
  let query = supabase
    .from("payments")
    .select("*, course:courses!inner(id, title, thumbnail_path, teacher_id), student:profiles!payments_student_id_fkey(id, full_name, email)")
    .eq("course.teacher_id", teacherId)
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Payment[];
}

export async function fetchAllPayments(status?: string) {
  let query = supabase
    .from("payments")
    .select("*, course:courses(id, title, thumbnail_path), student:profiles!payments_student_id_fkey(id, full_name, email)")
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Payment[];
}

export async function approvePayment(paymentId: string) {
  const { error } = await supabase.rpc("approve_payment", { p_payment_id: paymentId });
  if (error) throw error;
}

export async function rejectPayment(paymentId: string, reason: string) {
  const { error } = await supabase.rpc("reject_payment", { p_payment_id: paymentId, p_reason: reason });
  if (error) throw error;
}

export function getReceiptSignedUrlAsync(path: string) {
  // إيصالات الدفع في Bucket خاص؛ نولّد رابطًا موقّعًا صالحًا لمدة قصيرة عند الحاجة فقط
  return supabase.storage.from("payment-receipts").createSignedUrl(path, 60 * 5);
}
