-- Tie later installment availability to content released by the teacher.
-- Run after database/03-installments.sql.

update public.student_installments
set due_date = current_date,
    updated_at = now()
where status = 'scheduled';

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
      (p_student_id, p_course_id, i, v_amount, current_date, 'scheduled');
  end loop;
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

  if v_installment.month_number > 1 and not exists (
    select 1
    from public.course_sections cs
    join public.courses c on c.id = cs.course_id
    where cs.course_id = v_installment.course_id
      and cs.unlock_month = v_installment.month_number
      and c.is_published = true
  ) then
    raise exception 'Installment content has not been released';
  end if;

  if exists (
    select 1
    from public.student_installments previous_si
    where previous_si.student_id = v_installment.student_id
      and previous_si.course_id = v_installment.course_id
      and previous_si.month_number < v_installment.month_number
      and previous_si.status <> 'approved'
  ) then
    raise exception 'Previous installment is not approved';
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
          and (
            si.month_number = 1
            or exists (
              select 1
              from public.course_sections cs
              join public.courses c on c.id = cs.course_id
              where cs.course_id = si.course_id
                and cs.unlock_month = si.month_number
                and c.is_published = true
            )
          )
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
