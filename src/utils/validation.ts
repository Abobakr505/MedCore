import { z } from "zod";

const arabicMessages = {
  required: "هذا الحقل مطلوب",
  email: "يرجى إدخال بريد إلكتروني صحيح",
  minPassword: "كلمة المرور يجب أن تكون 6 أحرف على الأقل",
  phone: "يرجى إدخال رقم هاتف صحيح",
};

export const loginSchema = z.object({
  email: z.string().min(1, arabicMessages.required).email(arabicMessages.email),
  password: z.string().min(1, arabicMessages.required),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  fullName: z.string().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل"),
  email: z.string().min(1, arabicMessages.required).email(arabicMessages.email),
  phone: z.string().regex(/^01[0-2,5]{1}[0-9]{8}$|^\+?[0-9]{8,15}$/, arabicMessages.phone),
  password: z.string().min(6, arabicMessages.minPassword),
  confirmPassword: z.string().min(6, arabicMessages.minPassword),
  college: z.enum(["medicine", "dentistry", "pharmacy"], { required_error: arabicMessages.required }),
  role: z.enum(["student", "teacher"], { required_error: arabicMessages.required }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});
export type RegisterFormValues = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, arabicMessages.required).email(arabicMessages.email),
});
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z.object({
  password: z.string().min(6, arabicMessages.minPassword),
  confirmPassword: z.string().min(6, arabicMessages.minPassword),
}).refine((data) => data.password === data.confirmPassword, {
  message: "كلمتا المرور غير متطابقتين",
  path: ["confirmPassword"],
});
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const ticketSchema = z.object({
  subject: z.string().min(4, "العنوان قصير جدًا"),
  description: z.string().min(10, "يرجى كتابة وصف أوضح (10 أحرف على الأقل)"),
  category: z.enum(["technical", "payment", "course_content", "account", "other"]),
});
export type TicketFormValues = z.infer<typeof ticketSchema>;

export const courseSchema = z.object({
  title: z.string().min(3, "العنوان قصير جدًا"),
  description: z.string().min(10, "الوصف قصير جدًا"),
  college: z.enum(["medicine", "dentistry", "pharmacy"]),
  price: z.coerce.number().min(0, "السعر لا يمكن أن يكون سالبًا"),
});
export type CourseFormValues = z.infer<typeof courseSchema>;
