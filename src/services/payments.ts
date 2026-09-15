import { supabase } from "@/lib/supabase";
import type { Payment, StudentInstallment } from "@/types";
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


/** رفع إيصال أول قسط + إنشاء الدفعة + استدعاء إنشاء خطة الأقساط */
export async function uploadFirstInstallmentAndCreatePlan(params: {
  studentId: string;
  courseId: string;
  amount: number;
  file: File;
}) {
  const { studentId, courseId, amount, file } = params;
  const ext = file.name.split(".").pop();
  const path = `${studentId}/${courseId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-receipts")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({ student_id: studentId, course_id: courseId, amount, receipt_path: path, status: "pending" })
    .select()
    .single();
  if (insertError) throw insertError;

  const { error: planError } = await supabase.rpc("create_installment_plan", {
    p_student_id: studentId,
    p_course_id: courseId,
    p_payment_id: payment.id,
  });
  if (planError) {
    await supabase.from("payments").delete().eq("id", payment.id);
    await supabase.storage.from("payment-receipts").remove([path]);
    throw planError;
  }

  return payment;
}

/** جلب كل أقساط الطالب (كل الكورسات) مرتبة بتاريخ الاستحقاق */
export async function fetchStudentInstallments(studentId: string) {
  const { data, error } = await supabase
    .from("student_installments")
    .select("*, course:courses(id, title, thumbnail_path)")
    .eq("student_id", studentId)
    .order("due_date", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as StudentInstallment[];
}

/** رفع إيصال قسط تالي (شهر 2، 3 ...) */
export async function uploadInstallmentReceipt(params: {
  installmentId: string;
  studentId: string;
  courseId: string;
  amount: number;
  file: File;
}) {
  const { installmentId, studentId, courseId, amount, file } = params;
  const ext = file.name.split(".").pop();
  const path = `${studentId}/${courseId}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("payment-receipts")
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({
      student_id: studentId,
      course_id: courseId,
      amount,
      receipt_path: path,
      status: "pending",
      installment_id: installmentId,
    })
    .select()
    .single();
  if (insertError) throw insertError;

  const { error: updateError } = await supabase.rpc(
    "submit_installment_payment",
    {
      p_installment_id: installmentId,
      p_payment_id: payment.id,
      p_receipt_path: path,
    }
  );
  if (updateError) {
    await supabase.from("payments").delete().eq("id", payment.id);
    await supabase.storage.from("payment-receipts").remove([path]);
    throw updateError;
  }

  return payment;
}

export async function approveInstallmentPayment(paymentId: string) {
  const { error } = await supabase.rpc("approve_installment_payment", { p_payment_id: paymentId });
  if (error) throw error;
}

export async function rejectInstallmentPayment(paymentId: string, reason: string) {
  const { error } = await supabase.rpc("reject_installment_payment", { p_payment_id: paymentId, p_reason: reason });
  if (error) throw error;
}

export async function approvePaymentByType(payment: Pick<Payment, "id" | "installment_id">) {
  if (payment.installment_id) {
    return approveInstallmentPayment(payment.id);
  }

  return approvePayment(payment.id);
}

export async function rejectPaymentByType(
  payment: Pick<Payment, "id" | "installment_id">,
  reason: string,
) {
  if (payment.installment_id) {
    return rejectInstallmentPayment(payment.id, reason);
  }

  return rejectPayment(payment.id, reason);
}