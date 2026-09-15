-- Teacher payment destinations. Run after 01-schema.sql and installment migrations.

alter table public.profiles
  add column if not exists vodafone_number text,
  add column if not exists instapay_username text;

alter table public.courses
  add column if not exists vodafone_number text,
  add column if not exists instapay_username text;

create or replace function public.sync_teacher_payment_info()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'teacher' then
    update public.courses
      set vodafone_number = new.vodafone_number,
          instapay_username = new.instapay_username,
          updated_at = now()
    where teacher_id = new.id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_sync_teacher_payment_info on public.profiles;
create trigger trg_sync_teacher_payment_info
after insert or update of vodafone_number, instapay_username, role
on public.profiles
for each row execute function public.sync_teacher_payment_info();

update public.courses c
set vodafone_number = p.vodafone_number,
    instapay_username = p.instapay_username,
    updated_at = now()
from public.profiles p
where p.id = c.teacher_id
  and p.role = 'teacher';
