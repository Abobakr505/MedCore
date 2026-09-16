// أنواع مطابقة لهيكل قاعدة البيانات في database/01-schema.sql
// (بديل مبسّط ومكتوب يدويًا عن Supabase CLI type generation، حدّثه عند تغيير الـ SQL)

export type UserRole = "student" | "teacher" | "admin";
export type CollegeType =
  | "all"
  | "medicine"
  | "dentistry"
  | "pharmacy";
  export type UserStatus = "active" | "suspended" | "pending_verification";
export type CourseStatus = "draft" | "published" | "archived";
export type EnrollmentStatus = "pending" | "active" | "suspended" | "cancelled";
export type PaymentStatus = "pending" | "approved" | "rejected";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "low" | "medium" | "high" | "urgent";
export type TicketCategory = "technical" | "payment" | "course_content" | "account" | "other";

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  vodafone_number: string | null;
  instapay_username: string | null;
  role: UserRole;
  college: CollegeType;
  avatar_url: string | null;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface Course {
  id: string;
  teacher_id: string;
  college: CollegeType;
  title: string;
  slug: string;
  description: string;
  thumbnail_path: string | null;
  price: number;
  status: CourseStatus;
  is_published: boolean;
  rating: number;
  ratings_count: number;
  students_count: number;
  vodafone_number: string | null;
  instapay_username: string | null;
  created_at: string;
  updated_at: string;
  teacher?: Pick<Profile, "id" | "full_name" | "avatar_url">;
}

export interface CourseSection {
  id: string;
  course_id: string;
  title: string;
  description: string;
  order_index: number;
  lessons?: Lesson[];
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
export interface Lesson {
  id: string;
  section_id: string;

  title: string;
  description: string | null;

  duration_seconds: number;

  video_path: string | null;

  is_preview: boolean;

  files?: LessonFile[];

  created_at?: string;
}

export interface Enrollment {
  id: string;
  student_id: string;
  course_id: string;
  payment_id: string | null;
  status: EnrollmentStatus;
  enrolled_at: string | null;
  created_at: string;
  course?: Course;
}

export interface CartItem {
  id: string;
  student_id: string;
  course_id: string;
  added_at: string;
  course?: Course;
}

export interface Payment {
  id: string;
  student_id: string;
  course_id: string;
  amount: number;
  receipt_path: string;
  status: PaymentStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  course?: Pick<Course, "id" | "title" | "thumbnail_path">;
  student?: Pick<Profile, "id" | "full_name" | "email">;
}

export interface Quiz {
  id: string;
  course_id: string;
  section_id: string | null;
  lesson_id: string | null;
  title: string;
  description: string;
  duration_minutes: number;
  passing_score: number;
  created_at: string;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  points: number;
  order_index: number;
  options?: QuizOption[];
}

export interface QuizOption {
  id: string;
  question_id: string;
  option_text: string;
  is_correct?: boolean; // لا يُرسل للطالب أثناء الأداء
}

export interface QuizAttempt {
  id: string;
  quiz_id: string;
  student_id: string;
  score: number | null;
  percentage: number | null;
  started_at: string;
  submitted_at: string | null;
}

export interface LessonProgress {
  id: string;
  student_id: string;
  lesson_id: string;
  progress_seconds: number;
  completed: boolean;
  last_watched_at: string;
}

export interface SupportTicket {
  id: string;
  user_id: string;
  subject: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  created_at: string;
  updated_at: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  message: string;
  attachment_path: string | null;
  created_at: string;
  sender?: Pick<Profile, "full_name" | "role">;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_identifier: string;
  device_name: string | null;
  last_seen_at: string;
  is_active: boolean;
  created_at: string;
  user?: Pick<Profile, "full_name" | "email">;
}

export type InstallmentStatus = "scheduled" | "pending" | "approved" | "rejected";

export interface Course {
  // ...existing fields
  is_installment: boolean;
  installment_months: number | null;
  installment_amount: number | null;
}

export interface CourseSection {
  // ...existing fields
  unlock_month: number;
}

export interface StudentInstallment {
  id: string;
  student_id: string;
  course_id: string;
  payment_id: string | null;
  month_number: number;
  amount: number;
  due_date: string;
  status: InstallmentStatus;
  receipt_path: string | null;
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  course?: Pick<Course, "id" | "title" | "thumbnail_path">;
}

export interface Payment {
  // ...existing fields
  installment_id: string | null;
}

export const INSTALLMENT_STATUS_LABELS: Record<InstallmentStatus, string> = {
  scheduled: "لم يحن موعده",
  pending: "قيد المراجعة",
  approved: "مدفوع",
  rejected: "مرفوض",
};