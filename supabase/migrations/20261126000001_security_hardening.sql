-- ============================================================================
-- Security hardening (schema v2)
--
--  1. No passwords. Login is by email link or code only. Supabase Auth would still
--     accept password sign-ups through its public API, so someone could sign up
--     with another person's address before they do and keep a working password
--     after the real owner confirms it. Passwords are now never stored.
--  2. Comment moderation. Deleted comments can't be edited or restored. The text
--     of a deleted comment is moved to an admin-only table, so only admins can read it.
--     Suspended members can no longer edit their old comments.
--  3. "I've paid" only works for approved members.
--  4. Login rate limits, kept in the database (used by the server only).
-- ============================================================================

-- 1. No passwords ---------------------------------------------------------------
create function public.strip_password() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.encrypted_password := '';
  return new;
end $$;

create trigger strip_password before insert or update of encrypted_password on auth.users
  for each row when (coalesce(new.encrypted_password, '') <> '')
  execute function public.strip_password();

-- Remove any password that was set before this migration.
update auth.users set encrypted_password = '' where coalesce(encrypted_password, '') <> '';

revoke execute on function public.strip_password() from public, anon, authenticated;

-- 2. Comment moderation -----------------------------------------------------------
create table public.announcement_comment_archive (
  comment_id uuid primary key references public.announcement_comments (id) on delete cascade,
  body text not null,
  deleted_by uuid references public.profiles (id) on delete set null,
  deleted_at timestamptz not null default now()
);
alter table public.announcement_comment_archive enable row level security;
create policy "comment archive: admins read" on public.announcement_comment_archive
  for select to authenticated using ((select public.is_admin()));
revoke all on public.announcement_comment_archive from anon;

-- A deleted comment keeps an empty body.
alter table public.announcement_comments drop constraint announcement_comments_body_check;
alter table public.announcement_comments add constraint announcement_comments_body_check
  check (char_length(body) <= 5000 and (deleted_at is not null or char_length(body) >= 1));

-- Move the text of comments that were deleted before this migration.
insert into public.announcement_comment_archive (comment_id, body, deleted_at)
  select id, body, deleted_at from public.announcement_comments where deleted_at is not null and body <> '';
update public.announcement_comments set body = '' where deleted_at is not null;

create function public.guard_comment_update() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    new.deleted_at := null;
    return new;
  end if;

  if old.deleted_at is not null then
    raise exception 'A deleted comment cannot be changed.' using errcode = '42501';
  end if;

  if new.deleted_at is not null then
    insert into public.announcement_comment_archive (comment_id, body, deleted_by, deleted_at)
    values (old.id, old.body, auth.uid(), new.deleted_at)
    on conflict (comment_id) do nothing;
    new.body := '';
  end if;
  return new;
end $$;

create trigger guard_comment_update before insert or update on public.announcement_comments
  for each row execute function public.guard_comment_update();
revoke execute on function public.guard_comment_update() from public, anon, authenticated;

-- Authors must still be approved members to edit or delete their comments.
drop policy "comments: authors and admins update" on public.announcement_comments;
create policy "comments: authors and admins update" on public.announcement_comments
  for update to authenticated
  using ((author_id = (select auth.uid()) and (select public.is_member())) or (select public.is_admin()))
  with check ((author_id = (select auth.uid()) and (select public.is_member())) or (select public.is_admin()));

-- 3. "I've paid" only for approved members ------------------------------------------
create or replace function public.report_membership_payment(p_payment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then
    raise exception 'Only approved members can report payments.' using errcode = '42501';
  end if;
  update public.membership_payments
    set status = 'reported', reported_at = now()
    where id = p_payment_id and member_id = auth.uid() and status = 'unpaid';
end $$;

create or replace function public.report_event_payment(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_member() then
    raise exception 'Only approved members can report payments.' using errcode = '42501';
  end if;
  update public.event_attendees
    set payment_status = 'reported', payment_reported_at = now()
    where event_id = p_event_id and member_id = auth.uid() and payment_status = 'unpaid';
end $$;

-- 4. Login rate limits ----------------------------------------------------------------
-- Keys are SHA-256 hashes (of an IP address or email), so no personal data is stored.
create table public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 1,
  primary key (key, window_start)
);
alter table public.rate_limits enable row level security;
-- No policies: only the server (secret key) uses it.
revoke all on public.rate_limits from anon, authenticated;

-- Counts one attempt and returns true while the key is within its limit.
create function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer) returns boolean
language plpgsql security definer set search_path = '' as $$
declare
  v_window timestamptz := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  v_hits integer;
begin
  insert into public.rate_limits (key, window_start) values (p_key, v_window)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into v_hits;
  return v_hits <= p_limit;
end $$;

-- Deletes finished windows. Called by the daily cron job.
create function public.rate_limit_cleanup() returns void
language sql security definer set search_path = '' as $$
  delete from public.rate_limits where window_start < now() - interval '1 day';
$$;

revoke execute on function public.rate_limit_hit(text, integer, integer), public.rate_limit_cleanup()
  from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer), public.rate_limit_cleanup()
  to service_role;

-- Schema version ---------------------------------------------------------------------
update public.app_meta set value = '2' where key = 'schema_version';
