export * from "./database";

export const COLLEGE_LABELS: Record<string, string> = {
  medicine: "طب بشري",
  dentistry: "طب أسنان",
  pharmacy: "صيدلة",
};

export const TICKET_CATEGORY_LABELS: Record<string, string> = {
  technical: "مشكلة تقنية",
  payment: "استفسار عن دفع",
  course_content: "محتوى الكورس",
  account: "الحساب",
  other: "أخرى",
};

export const TICKET_STATUS_LABELS: Record<string, string> = {
  open: "مفتوحة",
  in_progress: "قيد المعالجة",
  resolved: "تم الحل",
  closed: "مغلقة",
};

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
};

export const ENROLLMENT_STATUS_LABELS: Record<string, string> = {
  pending: "قيد الانتظار",
  active: "نشط",
  suspended: "موقوف",
  cancelled: "ملغي",
};
