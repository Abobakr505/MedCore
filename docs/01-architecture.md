# Med Core — Phase 1: Architecture & Foundations

## 1. نظرة عامة على العمارة

```
┌─────────────────────────────────────────────────────────┐
│                     React + TypeScript (Vite)            │
│  Pages / Features / Components / Hooks / Contexts        │
└───────────────┬───────────────────────────┬──────────────┘
                │ Supabase JS Client        │ Supabase JS Client
                ▼                           ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   Supabase Auth            │   │  PostgreSQL + RLS          │
│  (Sessions, JWT, Roles)    │   │  (Tables, Policies,        │
│                             │   │   Triggers, Functions)     │
└───────────────┬────────────┘   └───────────────┬────────────┘
                │                                 │
                ▼                                 ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│  Supabase Storage           │   │  Edge Functions            │
│  (videos, receipts, avatars)│   │  (approve payment,         │
│   + Signed URLs             │   │   grade quiz, device check)│
└─────────────────────────────┘   └─────────────────────────────┘
```

### قرار معماري رئيسي #1 — الأمان بالكامل في الـ Backend
كل قرار وصول (هل يرى الطالب الفيديو؟ هل يقدر يعتمد دفعة؟) يُحسم في:
- RLS Policies (القراءة/الكتابة المباشرة)
- Edge Functions باستخدام `service_role` (العمليات المركّبة التي تحتاج Transaction: اعتماد الدفع + تفعيل الاشتراك معًا)

الـ Frontend **لا يُعتمد عليه أبدًا** لإخفاء بيانات حساسة (مثل `is_correct` أو `video_url` الخام).

### قرار معماري رئيسي #2 — لا نخزّن `video_url` مباشرة في الاستجابة العامة
جدول `lessons` يحتوي `video_path` (مسار داخل Storage خاص وليس رابطًا عامًا). لا يتم توليد Signed URL إلا عبر Edge Function `get-lesson-video-url` بعد التحقق من:
```
enrollment.status = 'active' AND courses.is_published = true
```
أو أن `lessons.is_preview = true`.

### قرار معماري رئيسي #3 — الدفع اليدوي كـ State Machine محمي بـ RPC
اعتماد الدفع لا يتم عبر `UPDATE` مباشر من الطالب/المعلم، بل عبر RPC function `approve_payment(payment_id)` تُنفَّذ داخل **transaction واحدة**: تحديث `payments.status` + إنشاء/تفعيل `enrollments` معًا أو الفشل الكامل (rollback). هذا يمنع الحالة المتناقضة (دفعة معتمدة بدون اشتراك، أو العكس).

### قرار معماري رئيسي #4 — Device Lock كطبقة حماية إضافية، وليست تشفيرًا مطلقًا
كما هو موضح في الطلب، لا يوجد Device ID موثوق 100% في المتصفح. الحل المعتمد:
- عند أول Login، ننشئ `device_identifier` = UUID عشوائي (وليس fingerprint) يُخزَّن في `localStorage` للمتصفح.
- عند كل طلب لموارد محمية (فيديو، اختبار)، تُرسل قيمة الـ device_identifier، وتُقارَن بجدول `user_devices`.
- إذا لم يوجد جهاز نشط: يُسجَّل هذا الجهاز كالجهاز النشط الوحيد.
- إذا وُجد جهاز نشط مختلف: يُرفض الوصول للمحتوى المدفوع مع رسالة واضحة + تسجيل المحاولة في `device_access_attempts`.
- الأدمن يقدر يعمل Reset من `admin dashboard` (RPC: `reset_user_device`).
- إعداد عام `platform_settings.device_lock_enabled` يتحكم في تفعيل/تعطيل الميزة عالميًا (افتراضيًا: مفعّلة).

> ملاحظة: هذا النظام يقلل مشاركة الحسابات لكنه لا يمنعها 100% تقنيًا (كما وضّحت في طلبك)، وهذا موثّق بوضوح حتى لا يُفهم كضمان مطلق.

---

## 2. الأدوار والصلاحيات (Role Permissions Matrix)

| العملية | Student | Teacher | Admin |
|---|---|---|---|
| قراءة/تعديل ملفه الشخصي فقط | ✅ | ✅ | ✅ |
| قراءة كورسات منشورة | ✅ | ✅ | ✅ |
| إنشاء/تعديل/حذف كورس خاص به | ❌ | ✅ (كورساته فقط) | ✅ (الكل) |
| نشر/إلغاء نشر كورس | ❌ | ✅ (كورساته) | ✅ |
| إنشاء أقسام/دروس/اختبارات | ❌ | ✅ (كورساته) | ✅ |
| رؤية `is_correct` في الاختبار | ❌ | ✅ (اختباراته) | ✅ |
| الاشتراك في كورس (Enrollment) | ✅ (لنفسه) | ❌ | ✅ (نيابة) |
| رفع إيصال دفع | ✅ (لنفسه) | ❌ | ❌ |
| اعتماد/رفض دفعة | ❌ | ✅ (كورساته فقط) | ✅ (الكل) |
| رؤية تقدّم طالب | ❌ (لنفسه فقط) | ✅ (طلابه المشتركين فقط) | ✅ |
| إنشاء Ticket دعم | ✅ | ✅ | ❌ (يرد فقط) |
| الرد على Tickets وتغيير حالتها | ❌ | ❌ | ✅ |
| إدارة `user_devices` (Reset) | ❌ | ❌ | ✅ |
| إدارة `platform_settings` | ❌ | ❌ | ✅ |

**قاعدة صارمة:** كل صف في الجدول أعلاه يُطبَّق كـ RLS Policy فعلية في PostgreSQL — وليس شرط `if role === 'admin'` في React.

---

## 3. Authentication Architecture

- **Provider:** Supabase Auth (Email + Password).
- عند التسجيل: يُنشأ سجل في `auth.users` تلقائيًا، ثم Trigger `handle_new_user()` ينسخ البيانات الإضافية (`full_name`, `role`, `college`, `phone`) من `raw_user_meta_data` إلى جدول `profiles` تلقائيًا — بذلك لا يستطيع أي مستخدم تمرير `role: admin` بنفسه لأن Trigger يتحكم بمصدر الحقيقة بعد التحقق (انظر تعليق داخل SQL).
- **Admin accounts:** لا يوجد Public Sign-up لها. تُنشأ فقط عبر:
  - Supabase Dashboard مباشرة، أو
  - RPC محمي `create_admin_user()` يُستدعى فقط من Edge Function بصلاحية `service_role`، ولا يُعرَّض هذا الـ endpoint في الـ Frontend العام.
- **Email Verification:** مفعّلة إجباريًا قبل الوصول لأي محتوى مدفوع (تحقق إضافي في RLS: `auth.users.email_confirmed_at IS NOT NULL`).
- **Password Reset:** Supabase built-in flow (`resetPasswordForEmail`).
- **Session Management:** Supabase JWT + Refresh Token، مع Auto-refresh في الـ Client.
- **Secure Logout:** `supabase.auth.signOut()` + مسح `device_identifier` من الحالة المحلية إن رغب المستخدم بتسجيل الخروج الكامل (اختياري، لا يُحذف من `user_devices` تلقائيًا لتفادي إساءة الاستخدام: "خروج ثم دخول من جهاز آخر بلا حدود").

---

## 4. Storage Buckets

| Bucket | Public? | المحتوى | سياسة الوصول |
|---|---|---|---|
| `avatars` | ✅ عام للقراءة | صور البروفايل | أي شخص يقرأ، فقط صاحب الملف يكتب/يحذف |
| `course-thumbnails` | ✅ عام للقراءة | صور غلاف الكورسات | المعلم صاحب الكورس أو الأدمن فقط يكتب |
| `course-videos` | ❌ خاص تمامًا | فيديوهات الدروس | لا قراءة مباشرة؛ فقط عبر Signed URL من Edge Function بعد التحقق من الاشتراك |
| `payment-receipts` | ❌ خاص تمامًا | إيصالات الدفع | الطالب صاحب الإيصال يقرأ/يكتب إيصاله فقط؛ المعلم صاحب الكورس المرتبط والأدمن يقرأون فقط |
| `ticket-attachments` | ❌ خاص | مرفقات تذاكر الدعم | صاحب التذكرة + الأدمن فقط |

---

## 5. هيكل الـ Routes

```text
/                              → Landing Page (عام)
/colleges                      → قائمة الكليات (عام)
/courses                       → قائمة الكورسات + بحث/فلاتر (عام)
/courses/:slug                 → تفاصيل كورس (عام جزئيًا - preview فقط)
/about /contact                → صفحات عامة (عام)

/auth/register                 → تسجيل (طالب/معلم)
/auth/login
/auth/forgot-password
/auth/reset-password
/auth/verify-email

/app                           → Layout بعد تسجيل الدخول (Protected)
/app/home                      → Home حسب الدور
/app/cart
/app/checkout
/app/checkout/payment/:id

/app/student/*                 → Student Dashboard (Role: student)
  /app/student/courses
  /app/student/courses/:id/learn
  /app/student/progress
  /app/student/quizzes
  /app/student/grades
  /app/student/payments
  /app/student/support
  /app/student/profile

/app/teacher/*                 → Teacher Dashboard (Role: teacher)
  /app/teacher/overview
  /app/teacher/courses
  /app/teacher/courses/:id/builder
  /app/teacher/courses/:id/quiz-builder
  /app/teacher/payments
  /app/teacher/students

/app/admin/*                   → Admin Dashboard (Role: admin)
  /app/admin/overview
  /app/admin/students
  /app/admin/teachers
  /app/admin/courses
  /app/admin/payments
  /app/admin/enrollments
  /app/admin/tickets
  /app/admin/devices
  /app/admin/settings
  /app/admin/reports
```

كل Route تحت `/app/teacher` و`/app/admin` محمي بطبقتين: `ProtectedRoute` (Frontend UX فقط لتوجيه المستخدم) + RLS (الحماية الحقيقية على مستوى البيانات).

`/app/admin/*` و `/app/teacher/*` و `/app/student/*` تحمل `noindex` لمحركات البحث (SEO — البند 32).

---

## 6. ERD — وصف مختصر للعلاقات

```
auth.users (1) ──── (1) profiles
profiles (1:N teacher) ──── courses
courses (1:N) ──── course_sections (1:N) ──── lessons
courses (1:N) ──── quizzes (1:N) ──── quiz_questions (1:N) ──── quiz_options
profiles(student) (1:N) ──── enrollments ──── (N:1) courses
profiles(student) (1:N) ──── cart_items ──── (N:1) courses
profiles(student) (1:N) ──── payments ──── (N:1) courses
profiles(student) (1:N) ──── lesson_progress ──── (N:1) lessons
profiles(student) (1:N) ──── quiz_attempts ──── (N:1) quizzes
quiz_attempts (1:N) ──── quiz_answers ──── (N:1) quiz_options
profiles (1:N) ──── user_devices
profiles (1:N) ──── device_access_attempts
profiles (1:N) ──── support_tickets (1:N) ──── ticket_messages
profiles (1:N) ──── notifications
```

الملف الكامل SQL موجود في: `database/01-schema.sql`
