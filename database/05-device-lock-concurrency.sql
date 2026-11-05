-- Apply this migration to existing databases to prevent concurrent device
-- checks from creating conflicting active-device registrations.
create or replace function public.check_or_register_device(p_device_identifier text, p_device_name text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_enabled boolean;
  v_user_role user_role;
  v_active public.user_devices%rowtype;
  v_allowed boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select role into v_user_role
    from public.profiles
    where id = auth.uid()
    for update;
  if not found then
    raise exception 'User profile not found';
  end if;

  if v_user_role = 'admin' then
    return jsonb_build_object('allowed', true, 'reason', 'admin_device_lock_exempt');
  end if;

  if p_device_identifier is null or btrim(p_device_identifier) = '' then
    raise exception 'Device identifier is required';
  end if;

  select (value #>> '{}')::boolean
    into v_enabled
    from public.platform_settings
    where key = 'device_lock_enabled';

  if not coalesce(v_enabled, true) then
    return jsonb_build_object('allowed', true, 'reason', 'device_lock_disabled');
  end if;

  select *
    into v_active
    from public.user_devices
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

  return jsonb_build_object(
    'allowed', v_allowed,
    'reason', case when v_allowed then 'same_device' else 'different_active_device' end
  );
end;
$$;
