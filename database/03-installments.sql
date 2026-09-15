-- Monthly installment support.
-- Run after 01-schema.sql and 02-quiz-scope.sql.

alter table public.courses
  add column if not exists is_installment boolean not null default false,
  add column if not exists installment_months integer,
  add column if not exists installment_amount numeric;

alter table public.course_sections
  add column if not exists unlock_month integer not null default 1;

create table if not exists public.student_installments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  payment_id uuid references public.payments(id) on delete set null,
  month_number integer not null check (month_number > 0),
  amount numeric not null check (amount > 0),
  due_date date not null,
  status text not null default 'scheduled'
    check (status in ('scheduled', 'pending', 'approved', 'rejected')),
  receipt_path text,
  rejection_reason text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, course_id, month_number)
);

create index if not exists idx_installments_student_course
  on public.student_installments(student_id, course_id);
create index if not exists idx_installments_due_date
  on public.student_installments(due_date)
  where status in ('scheduled', 'pending');

-- The FK is added after the table exists for fresh databases.
alter table public.payments
  add column if not exists installment_id uuid;

alter table public.student_installments
  drop constraint if exists student_installments_payment_id_fkey;
alter table public.student_installments
  add constraint student_installments_payment_id_fkey
  foreign key (payment_id) references public.payments(id) on delete set null;

alter table public.payments
  drop constraint if exists payments_installment_id_fkey;
alter table public.payments
  add constraint payments_installment_id_fkey
  foreign key (installment_id) references public.student_installments(id)
  on delete set null;

create or replace function public.create_installment_plan(
  p_student_id uuid,
  p_course_id uuid,
  p_payment_id uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_months integer;
  v_amount numeric;
  v_installment_id uuid;
  i integer;
begin
  if auth.uid() is null or auth.uid() <> p_student_id then
    raise exception 'Not authorized';
  end if;

  select installment_months, installment_amount
    into v_months, v_amount
  from public.courses
  where id = p_course_id and is_installment = true;

  if v_months is null or v_months < 2 or v_amount is null or v_amount <= 0 then
    raise exception 'Invalid installment course';
  end if;

  if not exists (
    select 1 from public.payments
    where id = p_payment_id
      and student_id = p_student_id
      and course_id = p_course_id
      and status = 'pending'
      and installment_id is null
  ) then
    raise exception 'Invalid initial payment';
  end if;

  if exists (
    select 1 from public.student_installments
    where student_id = p_student_id and course_id = p_course_id
  ) then
    raise exception 'Installment plan already exists';
  end if;

  insert into public.student_installments
    (student_id, course_id, payment_id, month_number, amount, due_date, status)
  values
    (p_student_id, p_course_id, p_payment_id, 1, v_amount, current_date, 'pending')
  returning id into v_installment_id;

  update public.payments
    set installment_id = v_installment_id
  where id = p_payment_id;

  for i in 2..v_months loop
    insert into public.student_installments
      (student_id, course_id, month_number, amount, due_date, status)
    values
      (p_student_id, p_course_id, i, v_amount,
       (current_date + ((i - 1) * interval '1 month'))::date,
       'scheduled');
  end loop;
end;
$$;

create or replace function public.approve_installment_payment(p_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_installment public.student_installments%rowtype;
  v_role user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('admin', 'teacher') then raise exception 'Not authorized'; end if;

  select * into v_payment from public.payments
  where id = p_payment_id and installment_id is not null for update;
  if not found then raise exception 'Installment payment not found'; end if;
  if v_payment.status <> 'pending' then raise exception 'Payment already reviewed'; end if;

  if v_role = 'teacher' and not exists (
    select 1 from public.courses where id = v_payment.course_id and teacher_id = auth.uid()
  ) then raise exception 'Not authorized'; end if;

  select * into v_installment from public.student_installments
  where id = v_payment.installment_id for update;
  if not found or v_installment.status <> 'pending' then
    raise exception 'Installment is not pending';
  end if;

  update public.payments
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;

  update public.student_installments
    set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = v_installment.id;

  if v_installment.month_number = 1 then
    insert into public.enrollments (student_id, course_id, payment_id, status, enrolled_at)
    values (v_payment.student_id, v_payment.course_id, p_payment_id, 'active', now())
    on conflict (student_id, course_id)
    do update set status = 'active', payment_id = p_payment_id, enrolled_at = now();
  end if;
end;
$$;

create or replace function public.reject_installment_payment(p_payment_id uuid, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment public.payments%rowtype;
  v_role user_role;
begin
  select role into v_role from public.profiles where id = auth.uid();
  if v_role not in ('admin', 'teacher') then raise exception 'Not authorized'; end if;

  select * into v_payment from public.payments
  where id = p_payment_id and installment_id is not null for update;
  if not found then raise exception 'Installment payment not found'; end if;
  if v_payment.status <> 'pending' then raise exception 'Payment already reviewed'; end if;

  if v_role = 'teacher' and not exists (
    select 1 from public.courses where id = v_payment.course_id and teacher_id = auth.uid()
  ) then raise exception 'Not authorized'; end if;

  update public.payments
    set status = 'rejected', rejection_reason = p_reason,
        reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_payment_id;

  update public.student_installments
    set status = 'rejected', rejection_reason = p_reason,
        reviewed_by = auth.uid(), reviewed_at = now(), updated_at = now()
  where id = v_payment.installment_id;
end;
$$;

create or replace function public.submit_installment_payment(
  p_installment_id uuid,
  p_payment_id uuid,
  p_receipt_path text
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_installment public.student_installments%rowtype;
begin
  select * into v_installment
  from public.student_installments
  where id = p_installment_id and student_id = auth.uid()
  for update;

  if not found then raise exception 'Installment not found'; end if;
  if v_installment.status not in ('scheduled', 'rejected') then
    raise exception 'Installment is not payable';
  end if;

  if not exists (
    select 1 from public.payments
    where id = p_payment_id
      and student_id = auth.uid()
      and course_id = v_installment.course_id
      and installment_id = p_installment_id
      and status = 'pending'
  ) then
    raise exception 'Invalid installment payment';
  end if;

  update public.student_installments
    set status = 'pending', payment_id = p_payment_id,
        receipt_path = p_receipt_path, rejection_reason = null,
        updated_at = now()
  where id = p_installment_id;
end;
$$;

alter table public.student_installments enable row level security;

drop policy if exists "installments_student_read_own" on public.student_installments;
create policy "installments_student_read_own" on public.student_installments
  for select using (student_id = auth.uid());

drop policy if exists "installments_teacher_read_own_courses" on public.student_installments;
create policy "installments_teacher_read_own_courses" on public.student_installments
  for select using (exists (
    select 1 from public.courses c
    where c.id = course_id and c.teacher_id = auth.uid()
  ));

drop policy if exists "installments_admin_full" on public.student_installments;
create policy "installments_admin_full" on public.student_installments
  for all using (public.current_role_name() = 'admin');

-- A student may only submit a later installment when the previous one is approved.
drop policy if exists "payments_student_insert_own" on public.payments;
create policy "payments_student_insert_own" on public.payments
  for insert with check (
    student_id = auth.uid()
    and status = 'pending'
    and (
      installment_id is null
      or exists (
        select 1 from public.student_installments si
        where si.id = installment_id
          and si.student_id = auth.uid()
          and si.status in ('scheduled', 'rejected')
          and not exists (
            select 1 from public.student_installments previous_si
            where previous_si.student_id = si.student_id
              and previous_si.course_id = si.course_id
              and previous_si.month_number < si.month_number
              and previous_si.status <> 'approved'
          )
      )
    )
  );

-- Section metadata remains visible to enrolled students; lesson/video access is
-- enforced by the edge function using public.can_access_section().
create or replace function public.can_access_section(p_section_id uuid, p_student_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.course_sections cs
    join public.enrollments e on e.course_id = cs.course_id
      and e.student_id = p_student_id and e.status = 'active'
    left join public.student_installments si on si.student_id = p_student_id
      and si.course_id = cs.course_id
      and si.month_number = cs.unlock_month
      and si.status = 'approved'
    where cs.id = p_section_id
      and (
        not exists (
          select 1 from public.courses installment_course
          where installment_course.id = cs.course_id
            and installment_course.is_installment = true
        )
        or exists (
          select 1
          from public.payments full_payment
          where full_payment.student_id = p_student_id
            and full_payment.course_id = cs.course_id
            and full_payment.status = 'approved'
            and full_payment.installment_id is null
        )
        or cs.unlock_month <= 1
        or si.id is not null
      )
  );
$$;

-- Safe to call repeatedly; the existing policy names are replaced.
drop policy if exists "sections_read" on public.course_sections;
create policy "sections_read" on public.course_sections
  for select using (
    exists (select 1 from public.courses c where c.id = course_id and (c.is_published or c.teacher_id = auth.uid()))
    or public.current_role_name() = 'admin'
  );

drop policy if exists "lessons_read_metadata" on public.lessons;
create policy "lessons_read_metadata" on public.lessons
  for select using (
    is_preview = true
    or exists (select 1 from public.course_sections cs join public.courses c on c.id = cs.course_id where cs.id = section_id and c.teacher_id = auth.uid())
    or exists (select 1 from public.course_sections cs where cs.id = section_id and public.can_access_section(cs.id))
    or public.current_role_name() = 'admin'
  );
