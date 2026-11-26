-- ============================================================================
-- The Community Project: heartbeat
-- The daily job records when it last ran. The write is guaranteed database activity, so a
-- free Supabase project isn't paused for inactivity, and admins are warned when the job
-- stops running (Admin → Setup check and the admin overview).
-- ============================================================================

-- Records that the daily job ran and returns the time. Only the server (secret key) calls it.
create function public.heartbeat() returns timestamptz
language sql security definer set search_path = '' as $$
  insert into public.app_meta (key, value) values ('last_heartbeat_at', to_json(now()) #>> '{}')
  on conflict (key) do update set value = excluded.value
  returning value::timestamptz;
$$;

-- When the daily job last ran, for admins and the server. Returns null for everyone else.
create function public.last_heartbeat() returns timestamptz
language sql stable security definer set search_path = '' as $$
  select value::timestamptz from public.app_meta
  where key = 'last_heartbeat_at' and (public.is_admin() or public.is_trusted_context());
$$;

revoke execute on function public.heartbeat(), public.last_heartbeat() from public, anon, authenticated;
grant execute on function public.heartbeat() to service_role;
grant execute on function public.last_heartbeat() to authenticated, service_role;

-- Schema version ---------------------------------------------------------------------
update public.app_meta set value = '3' where key = 'schema_version';
