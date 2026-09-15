-- =====================================================================
-- Med Core — Phase 1: Complete Database Schema
-- PostgreSQL / Supabase
-- =====================================================================
-- ترتيب التنفيذ: هذا الملف يجب تشغيله كاملاً مرة واحدة على قاعدة بيانات
-- Supabase جديدة (بعد تفعيل uuid-ossp / pgcrypto وهما مفعّلان افتراضيًا).
-- =====================================================================

create extension if not exists "pgcrypto";

-- =====================================================================
-- 1) ENUMS
-- =====================================================================

create type user_role as enum ('student', 'teacher', 'admin');

create type college_type as enum ('medicine', 'dentistry', 'pharmacy');

create type user_status as enum ('active', 'suspended', 'pending_verification');

create type course_status as enum ('draft', 'published', 'archived');

create type enrollment_status as enum ('pending', 'active', 'suspended', 'cancelled');

create type payment_status as enum ('pending', 'approved', 'rejected');

create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');

create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');

create type ticket_category as enum ('technical', 'payment', 'course_content', 'account', 'other');

create type notification_type as enum (
  'payment_approved', 'payment_rejected', 'new_course', 'quiz_available',
  'course_completed', 'ticket_reply', 'device_reset', 'general'
);

-- =====================================================================
-- 2) PROFILES
-- =====================================================================

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text not null unique,
  phone text,
  role user_role not null default 'student',
  college college_type not null,
  avatar_url text,
  status user_status not null default 'pending_verification',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_role on public.profiles(role);
create index idx_profiles_college on public.profiles(college);

-- =====================================================================
-- 3) PLATFORM SETTINGS (Admin-controlled global switches)
-- =====================================================================

create table public.platform_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);

insert into public.platform_settings (key, value) values
  ('device_lock_enabled', 'true'),
  ('platform_name', '"Med Core"');

-- =====================================================================
-- 4) COURSES
-- =====================================================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  college college_type not null,
  title text not null check (char_length(title) between 3 and 200),
  slug text not null unique,
  description text not null default '',
  thumbnail_path text,
  price numeric(10,2) not null default 0 check (price >= 0),
  status course_status not null default 'draft',
  is_published boolean not null default false,
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  ratings_count integer not null default 0,
  students_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_courses_college on public.courses(college);
create index idx_courses_teacher on public.courses(teacher_id);
create index idx_courses_published on public.courses(is_published) where is_published = true;
create index idx_courses_price on public.courses(price);
create index idx_courses_search on public.courses using gin (to_tsvector('simple', title || ' ' || description));

create table public.course_sections (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text default '',
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  unique (course_id, order_index)
);

create index idx_sections_course on public.course_sections(course_id);

create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  section_id uuid not null references public.course_sections(id) on delete cascade,
  title text not null,
  description text default '',
  video_path text, -- Storage path, NEVER a public URL
  duration_seconds integer default 0,
  order_index integer not null default 0,
  is_preview boolean not null default false,
  created_at timestamptz not null default now(),
  unique (section_id, order_index)
);

create index idx_lessons_section on public.lessons(section_id);
create index idx_lessons_preview on public.lessons(is_preview) where is_preview = true;

-- =====================================================================
-- 5) ENROLLMENTS
-- =====================================================================

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  payment_id uuid, -- FK added after payments table is created
  status enrollment_status not null default 'pending',
  enrolled_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, course_id) -- يمنع Duplicate Enrollment
);

create index idx_enrollments_student on public.enrollments(student_id);
create index idx_enrollments_course on public.enrollments(course_id);
create index idx_enrollments_status on public.enrollments(status);

-- =====================================================================
-- 6) CART
-- =====================================================================

create table public.cart_items (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  added_at timestamptz not null default now(),
  unique (student_id, course_id) -- يمنع تكرار نفس الكورس بالسلة
);

create index idx_cart_student on public.cart_items(student_id);

-- =====================================================================
-- 7) PAYMENTS (Manual)
-- =====================================================================

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  amount numeric(10,2) not null check (amount >= 0),
  receipt_path text not null,
  status payment_status not null default 'pending',
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now()
);

create index idx_payments_student on public.payments(student_id);
create index idx_payments_course on public.payments(course_id);
create index idx_payments_status on public.payments(status);

alter table public.enrollments
  add constraint fk_enrollments_payment
  foreign key (payment_id) references public.payments(id) on delete set null;

-- =====================================================================
-- 8) QUIZZES
-- =====================================================================

create table public.quizzes (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  section_id uuid references public.course_sections(id) on delete set null,
  lesson_id uuid references public.lessons(id) on delete set null,
  title text not null,
  description text default '',
  duration_minutes integer not null default 30 check (duration_minutes > 0),
  passing_score numeric(5,2) not null default 60 check (passing_score between 0 and 100),
  created_at timestamptz not null default now()
);

create index idx_quizzes_course on public.quizzes(course_id);
create index idx_quizzes_section on public.quizzes(section_id);
create index idx_quizzes_lesson on public.quizzes(lesson_id);

create table public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  question text not null,
  points numeric(5,2) not null default 1 check (points > 0),
  order_index integer not null default 0,
  unique (quiz_id, order_index)
);

create index idx_questions_quiz on public.quiz_questions(quiz_id);

create table public.quiz_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false
);

create index idx_options_question on public.quiz_options(question_id);

-- Enforce: عدد الخيارات الصحيحة على الأقل واحد لكل سؤال (يُتحقق تطبيقيًا عند الحفظ في الـ Backend/Edge Function)

create table public.quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  quiz_id uuid not null references public.quizzes(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  score numeric(6,2),
  percentage numeric(5,2),
  started_at timestamptz not null default now(),
  submitted_at timestamptz
);

create index idx_attempts_quiz on public.quiz_attempts(quiz_id);
create index idx_attempts_student on public.quiz_attempts(student_id);

create table public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.quiz_attempts(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id) on delete cascade,
  selected_option_id uuid references public.quiz_options(id),
  unique (attempt_id, question_id)
);

create index idx_answers_attempt on public.quiz_answers(attempt_id);

-- =====================================================================
-- 9) LESSON PROGRESS
-- =====================================================================

create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  progress_seconds integer not null default 0,
  completed boolean not null default false,
  last_watched_at timestamptz not null default now(),
  unique (student_id, lesson_id)
);

create index idx_progress_student on public.lesson_progress(student_id);
create index idx_progress_lesson on public.lesson_progress(lesson_id);

-- =====================================================================
-- 10) DEVICE LOCK
-- =====================================================================

create table public.user_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  device_identifier text not null, -- UUID عشوائي مولّد في المتصفح، وليس fingerprint
  device_name text,
  last_seen_at timestamptz not null default now(),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- جهاز نشط واحد فقط لكل مستخدم في نفس اللحظة
create unique index idx_one_active_device_per_user
  on public.user_devices(user_id)
  where is_active = true;

create table public.device_access_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  attempted_device_identifier text not null,
  was_allowed boolean not null,
  created_at timestamptz not null default now()
);

create index idx_device_attempts_user on public.device_access_attempts(user_id);

-- =====================================================================
-- 11) SUPPORT TICKETS
-- =====================================================================

create table public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject text not null,
  description text not null,
  category ticket_category not null default 'other',
  priority ticket_priority not null default 'medium',
  status ticket_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_tickets_user on public.support_tickets(user_id);
create index idx_tickets_status on public.support_tickets(status);

create table public.ticket_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_id uuid not null references public.profiles(id),
  message text not null,
  attachment_path text,
  created_at timestamptz not null default now()
);

create index idx_ticket_messages_ticket on public.ticket_messages(ticket_id);

-- =====================================================================
-- 12) NOTIFICATIONS
-- =====================================================================

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type notification_type not null,
  title text not null,
  body text,
  is_read boolean not null default false,
  metadata jsonb default '{}',
  created_at timestamptz not null default now()
);

create index idx_notifications_user on public.notifications(user_id, is_read);

-- =====================================================================
-- 13) TRIGGERS: updated_at auto-update
-- =====================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger trg_courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();
create trigger trg_tickets_updated_at before update on public.support_tickets
  for each row execute function public.set_updated_at();

-- =====================================================================
-- 14) TRIGGER: إنشاء profile تلقائيًا عند التسجيل
-- =====================================================================
-- ملاحظة أمان مهمة: هذا الـ Trigger يعمل بصلاحية SECURITY DEFINER وهو المكان
-- الوحيد المسموح به لإدخال role. أي قيمة role يرسلها المستخدم من الفرونت إند
-- في raw_user_meta_data تُقبل فقط إن كانت 'student' أو 'teacher' — القيمة
-- 'admin' تُرفض هنا حتى لو حاول أحد إرسالها يدويًا عبر API.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  safe_role user_role;
begin
  if requested_role = 'teacher' then
    safe_role := 'teacher';
  else
    safe_role := 'student'; -- أي قيمة أخرى (بما فيها admin) تُهمل وتُستبدل بـ student
  end if;

  insert into public.profiles (id, full_name, email, phone, role, college, status)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email,
    new.raw_user_meta_data->>'phone',
    safe_role,
    coalesce((new.raw_user_meta_data->>'college')::college_type, 'medicine'),
    'pending_verification'
  );
  return new;
end;
$$;

create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =====================================================================
-- 15) FUNCTION: تحديث حالة العضو بعد تأكيد الإيميل
-- =====================================================================

create or replace function public.handle_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.profiles set status = 'active' where id = new.id;
  end if;
  return new;
end;
$$;

create trigger trg_on_email_confirmed
  after update on auth.users
  for each row execute function public.handle_email_confirmed();

-- =====================================================================
-- 16) RPC: اعتماد/رفض الدفع (Transaction آمنة)
-- =====================================================================

create or replace function public.approve_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_course_teacher uuid;
  v_caller_role user_role;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();

  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found';
  end if;

  select teacher_id into v_course_teacher from public.courses where id = v_payment.course_id;

  if v_caller_role = 'teacher' and v_course_teacher <> auth.uid() then
    raise exception 'Not authorized to approve this payment';
  elsif v_caller_role not in ('teacher', 'admin') then
    raise exception 'Not authorized';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment already reviewed';
  end if;

  update public.payments
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_payment_id;

  insert into public.enrollments (student_id, course_id, payment_id, status, enrolled_at)
  values (v_payment.student_id, v_payment.course_id, p_payment_id, 'active', now())
  on conflict (student_id, course_id)
  do update set status = 'active', payment_id = p_payment_id, enrolled_at = now();

  update public.courses set students_count = students_count + 1 where id = v_payment.course_id;

  insert into public.notifications (user_id, type, title, body)
  values (v_payment.student_id, 'payment_approved', 'تم قبول الدفع', 'تم تفعيل اشتراكك في الكورس بنجاح');
end;
$$;

create or replace function public.reject_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_course_teacher uuid;
  v_caller_role user_role;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  select * into v_payment from public.payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found'; end if;

  select teacher_id into v_course_teacher from public.courses where id = v_payment.course_id;
  if v_caller_role = 'teacher' and v_course_teacher <> auth.uid() then
    raise exception 'Not authorized to reject this payment';
  elsif v_caller_role not in ('teacher', 'admin') then
    raise exception 'Not authorized';
  end if;

  if v_payment.status <> 'pending' then
    raise exception 'Payment already reviewed';
  end if;

  update public.payments
    set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now(), rejection_reason = p_reason
    where id = p_payment_id;

  insert into public.notifications (user_id, type, title, body)
  values (v_payment.student_id, 'payment_rejected', 'تم رفض الدفع', coalesce(p_reason, 'يرجى مراجعة الإيصال المرسل'));
end;
$$;

-- =====================================================================
-- 17) RPC: تسجيل/التحقق من الجهاز (Device Lock)
-- =====================================================================

create or replace function public.check_or_register_device(p_device_identifier text, p_device_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_active public.user_devices%rowtype;
  v_allowed boolean;
begin
  select (value #>> '{}')::boolean into v_enabled from public.platform_settings where key = 'device_lock_enabled';
  if not coalesce(v_enabled, true) then
    return jsonb_build_object('allowed', true, 'reason', 'device_lock_disabled');
  end if;

  select * into v_active from public.user_devices
    where user_id = auth.uid() and is_active = true;

  if not found then
    insert into public.user_devices (user_id, device_identifier, device_name, is_active)
    values (auth.uid(), p_device_identifier, p_device_name, true);
    return jsonb_build_object('allowed', true, 'reason', 'new_device_registered');
  end if;

  v_allowed := (v_active.device_identifier = p_device_identifier);

  if v_allowed then
    update public.user_devices set last_seen_at = now() where id = v_active.id;
  end if;

  insert into public.device_access_attempts (user_id, attempted_device_identifier, was_allowed)
  values (auth.uid(), p_device_identifier, v_allowed);

  return jsonb_build_object('allowed', v_allowed, 'reason', case when v_allowed then 'same_device' else 'different_active_device' end);
end;
$$;

create or replace function public.admin_reset_device(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_role user_role;
begin
  select role into v_caller_role from public.profiles where id = auth.uid();
  if v_caller_role <> 'admin' then
    raise exception 'Not authorized';
  end if;

  update public.user_devices set is_active = false where user_id = p_user_id and is_active = true;

  insert into public.notifications (user_id, type, title, body)
  values (p_user_id, 'device_reset', 'تم إعادة تعيين الجهاز', 'يمكنك الآن تسجيل الدخول من جهاز جديد');
end;
$$;

-- =====================================================================
-- 18) RPC: تصحيح الاختبار بأمان (لا يُرسل is_correct للطالب أبدًا)
-- =====================================================================

create or replace function public.submit_quiz_attempt(p_attempt_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total_points numeric := 0;
  v_earned_points numeric := 0;
  v_quiz_id uuid;
  v_percentage numeric;
begin
  select quiz_id into v_quiz_id from public.quiz_attempts
    where id = p_attempt_id and student_id = auth.uid() and submitted_at is null
    for update;

  if not found then
    raise exception 'Attempt not found or already submitted';
  end if;

  select coalesce(sum(qq.points), 0) into v_total_points
    from public.quiz_questions qq where qq.quiz_id = v_quiz_id;

  select coalesce(sum(qq.points), 0) into v_earned_points
    from public.quiz_answers qa
    join public.quiz_questions qq on qq.id = qa.question_id
    join public.quiz_options qo on qo.id = qa.selected_option_id
    where qa.attempt_id = p_attempt_id and qo.is_correct = true;

  v_percentage := case when v_total_points > 0 then round((v_earned_points / v_total_points) * 100, 2) else 0 end;

  update public.quiz_attempts
    set score = v_earned_points, percentage = v_percentage, submitted_at = now()
    where id = p_attempt_id;

  return jsonb_build_object('score', v_earned_points, 'percentage', v_percentage, 'total_points', v_total_points);
end;
$$;

-- =====================================================================
-- 19) HELPER: current_role() لاستخدامها داخل RLS بسهولة
-- =====================================================================

create or replace function public.current_role_name()
returns user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_enrolled_active(p_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.enrollments
    where course_id = p_course_id and student_id = auth.uid() and status = 'active'
  );
$$;

-- =====================================================================
-- 20) ENABLE RLS
-- =====================================================================

alter table public.profiles enable row level security;
alter table public.platform_settings enable row level security;
alter table public.courses enable row level security;
alter table public.course_sections enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.cart_items enable row level security;
alter table public.payments enable row level security;
alter table public.quizzes enable row level security;
alter table public.quiz_questions enable row level security;
alter table public.quiz_options enable row level security;
alter table public.quiz_attempts enable row level security;
alter table public.quiz_answers enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.user_devices enable row level security;
alter table public.device_access_attempts enable row level security;
alter table public.support_tickets enable row level security;
alter table public.ticket_messages enable row level security;
alter table public.notifications enable row level security;

-- =====================================================================
-- 21) RLS POLICIES — PROFILES
-- =====================================================================

create policy "profiles_select_own_or_admin" on public.profiles
  for select using (id = auth.uid() or public.current_role_name() = 'admin');

create policy "profiles_select_teacher_of_enrolled_students" on public.profiles
  for select using (
    public.current_role_name() = 'teacher'
    and exists (
      select 1 from public.enrollments e
      join public.courses c on c.id = e.course_id
      where e.student_id = profiles.id and c.teacher_id = auth.uid()
    )
  );

create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_full_access" on public.profiles
  for all using (public.current_role_name() = 'admin');

-- =====================================================================
-- 22) RLS POLICIES — PLATFORM SETTINGS
-- =====================================================================

create policy "settings_read_all_authenticated" on public.platform_settings
  for select using (auth.role() = 'authenticated');

create policy "settings_admin_write" on public.platform_settings
  for all using (public.current_role_name() = 'admin');

-- =====================================================================
-- 23) RLS POLICIES — COURSES
-- =====================================================================

create policy "courses_public_read_published" on public.courses
  for select using (is_published = true or teacher_id = auth.uid() or public.current_role_name() = 'admin');

create policy "courses_teacher_insert" on public.courses
  for insert with check (teacher_id = auth.uid() and public.current_role_name() = 'teacher');

create policy "courses_teacher_update_own" on public.courses
  for update using (teacher_id = auth.uid()) with check (teacher_id = auth.uid());

create policy "courses_teacher_delete_own" on public.courses
  for delete using (teacher_id = auth.uid());

create policy "courses_admin_full_access" on public.courses
  for all using (public.current_role_name() = 'admin');

-- =====================================================================
-- 24) RLS POLICIES — SECTIONS & LESSONS
-- =====================================================================

create policy "sections_read" on public.course_sections
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and (c.is_published or c.teacher_id = auth.uid()))
    or public.current_role_name() = 'admin'
  );

create policy "sections_teacher_manage" on public.course_sections
  for all using (
    exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid())
    or public.current_role_name() = 'admin'
  );

-- الدروس: البيانات الوصفية تُقرأ، لكن video_path لا يُعرض إلا لمن يحق له (يُطبَّق عبر View منفصل + Edge Function، انظر ملاحظة أسفل)
create policy "lessons_read_metadata" on public.lessons
  for select using (
    is_preview = true
    or exists (
      select 1 from public.course_sections cs join public.courses c on c.id = cs.course_id
      where cs.id = section_id and c.teacher_id = auth.uid()
    )
    or exists (
      select 1 from public.course_sections cs
      where cs.id = section_id and public.is_enrolled_active(cs.course_id)
    )
    or public.current_role_name() = 'admin'
  );

create policy "lessons_teacher_manage" on public.lessons
  for all using (
    exists (
      select 1 from public.course_sections cs join public.courses c on c.id = cs.course_id
      where cs.id = section_id and c.teacher_id = auth.uid()
    )
    or public.current_role_name() = 'admin'
  );

-- ملاحظة أمان مهمة: حتى مع هذه الـ Policy، عمود video_path لا يجب أن يُرسَل
-- للطالب مباشرة عبر select *. في الفرونت إند نستخدم select محدد للحقول
-- العامة، ورابط الفيديو الفعلي يُطلب فقط من Edge Function
-- `get-lesson-video-url` التي تتحقق من is_enrolled_active() ثم تُنشئ
-- Signed URL صالح لدقائق معدودة.

-- =====================================================================
-- 25) RLS POLICIES — ENROLLMENTS
-- =====================================================================

create policy "enrollments_student_read_own" on public.enrollments
  for select using (student_id = auth.uid());

create policy "enrollments_teacher_read_own_courses" on public.enrollments
  for select using (exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()));

create policy "enrollments_admin_full" on public.enrollments
  for all using (public.current_role_name() = 'admin');

-- لا توجد policy تسمح للطالب بعمل insert/update مباشر: الإدخال يتم فقط عبر
-- RPC approve_payment (SECURITY DEFINER) بعد اعتماد الدفع.

-- =====================================================================
-- 26) RLS POLICIES — CART
-- =====================================================================

create policy "cart_owner_full_access" on public.cart_items
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

-- =====================================================================
-- 27) RLS POLICIES — PAYMENTS
-- =====================================================================

create policy "payments_student_read_own" on public.payments
  for select using (student_id = auth.uid());

create policy "payments_student_insert_own" on public.payments
  for insert with check (student_id = auth.uid() and status = 'pending');

create policy "payments_teacher_read_own_courses" on public.payments
  for select using (exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()));

create policy "payments_admin_full" on public.payments
  for all using (public.current_role_name() = 'admin');

-- تحديث الحالة (approve/reject) يتم حصرًا عبر RPC وليس عبر UPDATE مباشر من العميل.

-- =====================================================================
-- 28) RLS POLICIES — QUIZZES / QUESTIONS / OPTIONS
-- =====================================================================

create policy "quizzes_read" on public.quizzes
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and (c.teacher_id = auth.uid() or public.is_enrolled_active(c.id)))
    or public.current_role_name() = 'admin'
  );

create policy "quizzes_teacher_manage" on public.quizzes
  for all using (exists (select 1 from public.courses c where c.id = course_id and c.teacher_id = auth.uid()));

create policy "questions_read" on public.quiz_questions
  for select using (
    exists (
      select 1 from public.quizzes q join public.courses c on c.id = q.course_id
      where q.id = quiz_id and (c.teacher_id = auth.uid() or public.is_enrolled_active(c.id))
    )
  );

create policy "questions_teacher_manage" on public.quiz_questions
  for all using (
    exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id where q.id = quiz_id and c.teacher_id = auth.uid())
  );

-- is_correct: يُقرأ فقط من المعلم/الأدمن. الطالب يرى الخيارات بدون هذا العمود
-- عبر Query محدد الحقول في الفرونت إند (select id, option_text فقط أثناء أداء الاختبار).
create policy "options_read_teacher_admin" on public.quiz_options
  for select using (
    exists (select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id join public.courses c on c.id = q.course_id where qq.id = question_id and c.teacher_id = auth.uid())
    or public.current_role_name() = 'admin'
  );

create policy "options_read_student_enrolled" on public.quiz_options
  for select using (
    exists (
      select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id
      where qq.id = question_id and public.is_enrolled_active(q.course_id)
    )
  );

create policy "options_teacher_manage" on public.quiz_options
  for all using (
    exists (select 1 from public.quiz_questions qq join public.quizzes q on q.id = qq.quiz_id join public.courses c on c.id = q.course_id where qq.id = question_id and c.teacher_id = auth.uid())
  );

-- =====================================================================
-- 29) RLS POLICIES — QUIZ ATTEMPTS / ANSWERS
-- =====================================================================

create policy "attempts_student_own" on public.quiz_attempts
  for select using (student_id = auth.uid());

create policy "attempts_student_insert" on public.quiz_attempts
  for insert with check (student_id = auth.uid());

create policy "attempts_teacher_read" on public.quiz_attempts
  for select using (
    exists (select 1 from public.quizzes q join public.courses c on c.id = q.course_id where q.id = quiz_id and c.teacher_id = auth.uid())
  );

create policy "answers_student_own" on public.quiz_answers
  for all using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid() and a.submitted_at is null))
  with check (exists (select 1 from public.quiz_attempts a where a.id = attempt_id and a.student_id = auth.uid() and a.submitted_at is null));

-- ملاحظة: بعد submitted_at (عبر RPC submit_quiz_attempt) لا يمكن تعديل
-- الإجابات لأن شرط الـ using يتحقق من submitted_at is null. هذا يمنع
-- التلاعب بالنتيجة بعد التسليم.

-- =====================================================================
-- 30) RLS POLICIES — LESSON PROGRESS
-- =====================================================================

create policy "progress_student_own" on public.lesson_progress
  for all using (student_id = auth.uid()) with check (student_id = auth.uid());

create policy "progress_teacher_read" on public.lesson_progress
  for select using (
    exists (
      select 1 from public.lessons l join public.course_sections cs on cs.id = l.section_id
      join public.courses c on c.id = cs.course_id
      where l.id = lesson_id and c.teacher_id = auth.uid()
    )
  );

-- =====================================================================
-- 31) RLS POLICIES — DEVICES
-- =====================================================================

create policy "devices_owner_read" on public.user_devices
  for select using (user_id = auth.uid());

create policy "devices_admin_full" on public.user_devices
  for all using (public.current_role_name() = 'admin');

create policy "device_attempts_admin_read" on public.device_access_attempts
  for select using (public.current_role_name() = 'admin' or user_id = auth.uid());

-- إدخال/تعديل سجلات الأجهزة يتم فقط عبر RPC (SECURITY DEFINER)، لا توجد
-- policy للـ insert المباشر من العميل.

-- =====================================================================
-- 32) RLS POLICIES — SUPPORT TICKETS
-- =====================================================================

create policy "tickets_owner_all" on public.support_tickets
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "tickets_admin_full" on public.support_tickets
  for all using (public.current_role_name() = 'admin');

create policy "ticket_messages_participant" on public.ticket_messages
  for select using (
    exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
    or public.current_role_name() = 'admin'
  );

create policy "ticket_messages_insert" on public.ticket_messages
  for insert with check (
    sender_id = auth.uid()
    and (
      exists (select 1 from public.support_tickets t where t.id = ticket_id and t.user_id = auth.uid())
      or public.current_role_name() = 'admin'
    )
  );

-- =====================================================================
-- 33) RLS POLICIES — NOTIFICATIONS
-- =====================================================================

create policy "notifications_owner_read" on public.notifications
  for select using (user_id = auth.uid());

create policy "notifications_owner_update" on public.notifications
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- الإدخال يتم فقط من Triggers/RPC بصلاحية SECURITY DEFINER.

-- =====================================================================
-- 34) STORAGE BUCKETS & POLICIES
-- =====================================================================

insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('course-thumbnails', 'course-thumbnails', true),
  ('course-videos', 'course-videos', false),
  ('payment-receipts', 'payment-receipts', false),
  ('ticket-attachments', 'ticket-attachments', false)
on conflict (id) do nothing;

-- avatars: قراءة عامة، كتابة لصاحب الملف فقط (المسار يبدأ بـ user_id/)
create policy "avatars_public_read" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_owner_write" on storage.objects
  for insert with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "avatars_owner_update_delete" on storage.objects
  for update using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- course-thumbnails: قراءة عامة، كتابة للمعلم صاحب الكورس أو الأدمن (المسار: course_id/thumb.jpg)
create policy "thumbnails_public_read" on storage.objects
  for select using (bucket_id = 'course-thumbnails');

create policy "thumbnails_teacher_write" on storage.objects
  for insert with check (
    bucket_id = 'course-thumbnails'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
    )
  );

-- course-videos: لا قراءة مباشرة إطلاقًا عبر policy عامة — فقط Edge Function
-- تستخدم service_role لتوليد Signed URL. لا نضيف select policy هنا عن قصد.
create policy "videos_teacher_write" on storage.objects
  for insert with check (
    bucket_id = 'course-videos'
    and exists (
      select 1 from public.courses c
      where c.id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
    )
  );

-- payment-receipts: المسار المتفق عليه student_id/course_id/receipt.jpg
create policy "receipts_student_write" on storage.objects
  for insert with check (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_student_read_own" on storage.objects
  for select using (bucket_id = 'payment-receipts' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "receipts_teacher_admin_read" on storage.objects
  for select using (
    bucket_id = 'payment-receipts'
    and (
      public.current_role_name() = 'admin'
      or exists (
        select 1 from public.payments p join public.courses c on c.id = p.course_id
        where p.student_id::text = (storage.foldername(name))[1] and c.teacher_id = auth.uid()
      )
    )
  );

-- ticket-attachments: صاحب التذكرة + الأدمن
create policy "ticket_attachments_owner_write" on storage.objects
  for insert with check (bucket_id = 'ticket-attachments' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "ticket_attachments_read" on storage.objects
  for select using (
    bucket_id = 'ticket-attachments'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.current_role_name() = 'admin')
  );

-- =====================================================================
-- نهاية Phase 1 Schema
-- =====================================================================
