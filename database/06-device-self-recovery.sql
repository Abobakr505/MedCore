-- Enable password-confirmed self-service device recovery for existing databases.
create table if not exists public.user_device_recoveries (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  recovered_at timestamptz not null default now()
);

alter table public.user_device_recoveries enable row level security;
revoke all on public.user_device_recoveries from public, anon, authenticated;

create or replace function public.recover_user_device(
  p_user_id uuid,
  p_device_identifier text,
  p_device_name text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_last_recovery timestamptz;
  v_active public.user_devices%rowtype;
  v_available_at timestamptz;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception 'Not authorized';
  end if;

  if p_user_id is null or p_device_identifier is null or btrim(p_device_identifier) = '' then
    raise exception 'User and device identifier are required';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'User profile not found';
  end if;

  select * into v_active
    from public.user_devices
    where user_id = p_user_id and is_active = true;

  if found and v_active.device_identifier = p_device_identifier then
    update public.user_devices set last_seen_at = now() where id = v_active.id;
    return jsonb_build_object('success', true, 'already_registered', true);
  end if;

  select recovered_at into v_last_recovery
    from public.user_device_recoveries
    where user_id = p_user_id;

  if v_last_recovery is not null then
    v_available_at := v_last_recovery + interval '30 days';
    if now() < v_available_at then
      return jsonb_build_object(
        'success', false,
        'reason', 'cooldown',
        'available_at', v_available_at
      );
    end if;
  end if;

  update public.user_devices
    set is_active = false
    where user_id = p_user_id and is_active = true;

  insert into public.user_devices (user_id, device_identifier, device_name, is_active)
  values (p_user_id, p_device_identifier, p_device_name, true);

  insert into public.user_device_recoveries (user_id, recovered_at)
  values (p_user_id, now())
  on conflict (user_id) do update set recovered_at = excluded.recovered_at;

  insert into public.notifications (user_id, type, title, body)
  values (
    p_user_id,
    'device_reset',
    'تم نقل الجهاز المرتبط بالحساب',
    'تم نقل ربط حسابك إلى جهاز جديد بناءً على طلبك. إذا لم تطلب هذا التغيير، غيّر كلمة مرورك وتواصل مع الدعم.'
  );

  return jsonb_build_object('success', true, 'already_registered', false);
end;
$$;

revoke all on function public.recover_user_device(uuid, text, text) from public, anon, authenticated;
grant execute on function public.recover_user_device(uuid, text, text) to service_role;
