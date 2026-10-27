import { supabase } from "@/lib/supabase";
import type { Payment, StudentInstallment } from "@/types";

/* =========================================================
 * Receipt upload helpers
 * ========================================================= */

const BUCKET = "payment-receipts";

const MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

const EXT_TO_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
};

/** الامتداد بيتحدد من نوع الملف (MIME) أولًا، وبعدين من الاسم لو آمن، وإلا jpg */
function getSafeExt(file: File): string {
  const fromMime = MIME_TO_EXT[file.type?.toLowerCase()];
  if (fromMime) return fromMime;

  const parts = file.name.split(".");
  const fromName =
    parts.length > 1 ? parts.pop()!.toLowerCase().trim() : "";

  return /^[a-z0-9]{2,5}$/.test(fromName) ? fromName : "jpg";
}

function getContentType(file: File, ext: string): string {
  return file.type || EXT_TO_MIME[ext] || "image/jpeg";
}

/**
 * ضغط الصورة قبل الرفع (بيحل مشاكل النت الضعيف وصور الموبايل الكبيرة).
 * الـ PDF بيتسلّم زي ما هو، ولو الضغط فشل بنرجع الملف الأصلي.
 *
 * التثبيت: npm i browser-image-compression
 */
export async function prepareReceiptFile(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  // الصور الصغيرة مش محتاجة ضغط
  if (file.size <= 1024 * 1024) return file;

  try {
    const { default: imageCompression } = await import(
      "browser-image-compression"
    );

    const compressed = await imageCompression(file, {
      maxSizeMB: 1.5,
      maxWidthOrHeight: 2000,
      useWebWorker: true,
      fileType: "image/jpeg",
    });

    return new File([compressed], `receipt-${Date.now()}.jpg`, {
      type: "image/jpeg",
    });
  } catch (error) {
    console.warn("IMAGE COMPRESSION FAILED, using original file:", error);
    return file;
  }
}

/** رفع الإيصال للـ Storage وإرجاع المسار */
async function uploadReceiptToStorage(params: {
  studentId: string;
  courseId: string;
  file: File;
}): Promise<string> {
  const { studentId, courseId, file } = params;

  const ext = getSafeExt(file);
  const path = `${studentId}/${courseId}/${Date.now()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: getContentType(file, ext),
  });

  if (error) throw error;

  return path;
}

/** تنظيف بعد فشل جزئي (بدون ما نكسر الخطأ الأصلي) */
async function cleanupFailedPayment(paymentId: string, path: string) {
  try {
    const { error: deleteError } = await supabase
      .from("payments")
      .delete()
      .eq("id", paymentId);

    if (deleteError) {
      console.error("CLEANUP: payment delete failed:", deleteError);
    }
  } catch (e) {
    console.error("CLEANUP: payment delete threw:", e);
  }

  try {
    const { error: removeError } = await supabase.storage
      .from(BUCKET)
      .remove([path]);

    if (removeError) {
      console.error("CLEANUP: file remove failed:", removeError);
    }
  } catch (e) {
    console.error("CLEANUP: file remove threw:", e);
  }
}

/* =========================================================
 * Student payments
 * ========================================================= */

export async function uploadReceiptAndCreatePayment(params: {
  studentId: string;
  courseId: string;
  amount: number;
  file: File;
}) {
  const { studentId, courseId, amount, file } = params;

  const path = await uploadReceiptToStorage({ studentId, courseId, file });

  const { error: insertError } = await supabase.from("payments").insert({
    student_id: studentId,
    course_id: courseId,
    amount,
    receipt_path: path,
    status: "pending",
  });

  if (insertError) {
    // الملف اترفع لكن تسجيل الدفعة فشل: نشيل الملف عشان ميبقاش يتيم
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch (e) {
      console.error("CLEANUP: file remove threw:", e);
    }
    throw insertError;
  }
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

export async function fetchTeacherPayments(
  teacherId: string,
  status?: string
): Promise<Payment[]> {
  if (!teacherId) {
    throw new Error("Teacher ID is required");
  }

  let query = supabase
    .from("payments")
    .select(`
      *,
      course:courses!inner(
        id,
        title,
        thumbnail_path,
        teacher_id
      ),
      student:profiles!payments_student_id_fkey(
        id,
        full_name,
        email
      )
    `)
    .eq("course.teacher_id", teacherId)
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;

  if (error) {
    console.error("fetchTeacherPayments error:", error);
    throw error;
  }

  return (data ?? []) as unknown as Payment[];
}

export async function fetchAllPayments(status?: string) {
  let query = supabase
    .from("payments")
    .select(
      "*, course:courses(id, title, thumbnail_path), student:profiles!payments_student_id_fkey(id, full_name, email)"
    )
    .order("created_at", { ascending: false });
  if (status) query = query.eq("status", status);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as Payment[];
}

export async function approvePayment(paymentId: string) {
  const { error } = await supabase.rpc("approve_payment", {
    p_payment_id: paymentId,
  });
  if (error) throw error;
}

export async function rejectPayment(paymentId: string, reason: string) {
  const { error } = await supabase.rpc("reject_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
  if (error) throw error;
}

export function getReceiptSignedUrlAsync(path: string) {
  // إيصالات الدفع في Bucket خاص؛ نولّد رابطًا موقّعًا صالحًا لمدة قصيرة عند الحاجة فقط
  return supabase.storage.from(BUCKET).createSignedUrl(path, 60 * 5);
}

/* =========================================================
 * Installments
 * ========================================================= */

/** رفع إيصال أول قسط + إنشاء الدفعة + استدعاء إنشاء خطة الأقساط */
export async function uploadFirstInstallmentAndCreatePlan(params: {
  studentId: string;
  courseId: string;
  amount: number;
  file: File;
}) {
  const { studentId, courseId, amount, file } = params;

  const path = await uploadReceiptToStorage({ studentId, courseId, file });

  const { data: payment, error: insertError } = await supabase
    .from("payments")
    .insert({
      student_id: studentId,
      course_id: courseId,
      amount,
      receipt_path: path,
      status: "pending",
    })
    .select()
    .single();

  if (insertError) {
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch (e) {
      console.error("CLEANUP: file remove threw:", e);
    }
    throw insertError;
  }

  const { error: planError } = await supabase.rpc("create_installment_plan", {
    p_student_id: studentId,
    p_course_id: courseId,
    p_payment_id: payment.id,
  });

  if (planError) {
    await cleanupFailedPayment(payment.id, path);
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

  const path = await uploadReceiptToStorage({ studentId, courseId, file });

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

  if (insertError) {
    try {
      await supabase.storage.from(BUCKET).remove([path]);
    } catch (e) {
      console.error("CLEANUP: file remove threw:", e);
    }
    throw insertError;
  }

  const { error: updateError } = await supabase.rpc(
    "submit_installment_payment",
    {
      p_installment_id: installmentId,
      p_payment_id: payment.id,
      p_receipt_path: path,
    }
  );

  if (updateError) {
    await cleanupFailedPayment(payment.id, path);
    throw updateError;
  }

  return payment;
}

export async function approveInstallmentPayment(paymentId: string) {
  const { error } = await supabase.rpc("approve_installment_payment", {
    p_payment_id: paymentId,
  });
  if (error) throw error;
}

export async function rejectInstallmentPayment(
  paymentId: string,
  reason: string
) {
  const { error } = await supabase.rpc("reject_installment_payment", {
    p_payment_id: paymentId,
    p_reason: reason,
  });
  if (error) throw error;
}

export async function approvePaymentByType(
  payment: Pick<Payment, "id" | "installment_id">
) {
  if (payment.installment_id) {
    return approveInstallmentPayment(payment.id);
  }

  return approvePayment(payment.id);
}

export async function rejectPaymentByType(
  payment: Pick<Payment, "id" | "installment_id">,
  reason: string
) {
  if (payment.installment_id) {
    return rejectInstallmentPayment(payment.id, reason);
  }

  return rejectPayment(payment.id, reason);
}