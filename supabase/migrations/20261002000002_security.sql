-- ============================================================================
-- Security: helper functions, protected profile fields, row-level security.
--
-- Invariants (tested in supabase/tests/):
--   • Only admins (or the server's secret key) can change a profile's role, status,
--     member number, approval fields or email.
--   • The last approved admin cannot be demoted, suspended or deleted.
--   • Pending, rejected and suspended users can only read their own profile.
-- ============================================================================

-- Helpers ----------------------------------------------------------------------
create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'admin' and status = 'approved'
  );
$$;

create function public.is_member() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and status = 'approved'
  );
$$;

-- Requests through the API always carry a JWT role. Direct database sessions
-- (migrations, the SQL editor, the seed) have none and are trusted.
create function public.is_trusted_context() returns boolean
language sql stable set search_path = '' as $$
  select coalesce(auth.role(), 'trusted') in ('service_role', 'trusted');
$$;

-- Protected profile fields -----------------------------------------------------
create function public.guard_profile_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if public.is_trusted_context() or public.is_admin() then
    -- Never remove the last approved admin.
    if old.role = 'admin' and old.status = 'approved'
       and (new.role <> 'admin' or new.status <> 'approved')
       and not exists (
         select 1 from public.profiles
         where role = 'admin' and status = 'approved' and id <> old.id
       ) then
      raise exception 'The community must always have at least one admin.' using errcode = 'P0001';
    end if;

    -- Assign a member number and record approval the first time someone is approved.
    if new.status = 'approved' and old.status <> 'approved' then
      new.approved_at := now();
      new.approved_by := coalesce(auth.uid(), new.approved_by);
      if new.member_number is null then
        new.member_number := nextval('public.member_number_seq');
      end if;
    end if;
  else
    if new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.member_number is distinct from old.member_number
       or new.approved_at is distinct from old.approved_at
       or new.approved_by is distinct from old.approved_by
       or new.email is distinct from old.email
       or new.join_message is distinct from old.join_message
       or new.created_at is distinct from old.created_at
       or new.id is distinct from old.id then
      raise exception 'You are not allowed to change these profile fields.' using errcode = '42501';
    end if;
  end if;

  new.updated_at := now();
  return new;
end $$;

create trigger guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

create function public.guard_profile_delete() returns trigger
language plpgsql set search_path = '' as $$
begin
  if old.role = 'admin' and old.status = 'approved' and not exists (
    select 1 from public.profiles where role = 'admin' and status = 'approved' and id <> old.id
  ) then
    raise exception 'The community must always have at least one admin.' using errcode = 'P0001';
  end if;
  return old;
end $$;

create trigger guard_profile_delete before delete on public.profiles
  for each row execute function public.guard_profile_delete();

-- Row-level security -------------------------------------------------------------
alter table public.app_meta enable row level security;
alter table public.profiles enable row level security;
alter table public.community_settings enable row level security;
alter table public.payment_details enable row level security;
alter table public.membership_payments enable row level security;
alter table public.events enable row level security;
alter table public.event_attendees enable row level security;
alter table public.announcements enable row level security;
alter table public.announcement_comments enable row level security;
alter table public.privacy_policies enable row level security;
alter table public.notification_log enable row level security;
-- app_meta and notification_log have no policies: only the server (secret key) uses them.

-- profiles
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = (select auth.uid()) or (select public.is_admin()));
create policy "profiles: update own" on public.profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy "profiles: admins update" on public.profiles
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "profiles: admins delete" on public.profiles
  for delete to authenticated using ((select public.is_admin()));

-- Approved members can see each other's display names, and nothing else, through this view.
create view public.member_names with (security_invoker = false) as
  select id, display_name from public.profiles
  where status = 'approved' and public.is_member();
revoke all on public.member_names from anon, public;
grant select on public.member_names to authenticated;

-- community_settings: everyone can read (the landing page needs the logo and colors)
create policy "settings: public read" on public.community_settings
  for select to anon, authenticated using (true);
create policy "settings: admins update" on public.community_settings
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- payment_details: approved members only
create policy "payment details: members read" on public.payment_details
  for select to authenticated using ((select public.is_member()));
create policy "payment details: admins update" on public.payment_details
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- membership_payments: own rows; members report through report_membership_payment()
create policy "payments: read own" on public.membership_payments
  for select to authenticated using (member_id = (select auth.uid()) or (select public.is_admin()));
create policy "payments: admins write" on public.membership_payments
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- events: published events for approved members
create policy "events: members read published" on public.events
  for select to authenticated using ((published and (select public.is_member())) or (select public.is_admin()));
create policy "events: admins write" on public.events
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- event_attendees: own rows; members RSVP through rsvp_event()
create policy "attendees: read own" on public.event_attendees
  for select to authenticated using (member_id = (select auth.uid()) or (select public.is_admin()));
create policy "attendees: admins write" on public.event_attendees
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- announcements: published ones for approved members
create policy "announcements: members read published" on public.announcements
  for select to authenticated using (
    (published_at is not null and published_at <= now() and (select public.is_member()))
    or (select public.is_admin())
  );
create policy "announcements: admins write" on public.announcements
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- announcement_comments
create policy "comments: members read" on public.announcement_comments
  for select to authenticated using (
    (select public.is_admin())
    or ((select public.is_member()) and exists (
      select 1 from public.announcements a
      where a.id = announcement_id and a.published_at is not null and a.published_at <= now()
    ))
  );
create policy "comments: members create" on public.announcement_comments
  for insert to authenticated with check (
    (select public.is_member())
    and author_id = (select auth.uid())
    and exists (
      select 1 from public.announcements a
      where a.id = announcement_id and a.allow_comments
        and a.published_at is not null and a.published_at <= now()
    )
  );
create policy "comments: authors and admins update" on public.announcement_comments
  for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));
-- Members may only edit the text or soft-delete, not move a comment or change its author.
revoke update on public.announcement_comments from authenticated;
grant update (body, deleted_at) on public.announcement_comments to authenticated;

-- privacy_policies: public; admins publish new versions
create policy "privacy: public read" on public.privacy_policies
  for select to anon, authenticated using (true);
create policy "privacy: admins publish" on public.privacy_policies
  for insert to authenticated with check ((select public.is_admin()));

-- Anonymous visitors only need the public settings and the privacy policy.
revoke all on public.profiles, public.payment_details, public.membership_payments, public.events,
  public.event_attendees, public.announcements, public.announcement_comments,
  public.notification_log, public.app_meta from anon;
