-- =============================================================================
-- THE COMMUNITY PROJECT: DATABASE SETUP
--
-- Paste this whole file into Supabase → SQL Editor → "New query" and click "Run".
-- Run it ONCE on a new, empty project. To update an existing project, run only
-- the new migration files instead (see docs/UPGRADING.md).
--
-- GENERATED FILE: do not edit. Change supabase/migrations/ and run
-- `npm run db:setup-sql`.
-- =============================================================================

-- ─── 20261002000001_core_schema.sql ────────────────────────────────────────

-- ============================================================================
-- The Community Project: core schema
-- Tables, types and triggers. Security (RLS) is in the next migration.
-- ============================================================================

-- Types ---------------------------------------------------------------------
create type public.member_role as enum ('member', 'admin');
create type public.member_status as enum ('pending', 'approved', 'rejected', 'suspended');
create type public.payment_status as enum ('unpaid', 'reported', 'confirmed', 'waived');
create type public.rsvp_status as enum ('going', 'cancelled');

-- App metadata (schema version for the setup check) -------------------------
create table public.app_meta (
  key text primary key,
  value text not null
);

-- Profiles: one per auth user ------------------------------------------------
create sequence public.member_number_seq;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  display_name text not null default '' check (char_length(display_name) <= 80),
  member_number integer unique,
  role public.member_role not null default 'member',
  status public.member_status not null default 'pending',
  join_message text check (char_length(join_message) <= 2000),
  locale text check (locale ~ '^[a-z]{2}$'),
  notify_events boolean not null default true,
  notify_announcements boolean not null default true,
  privacy_accepted_version integer,
  privacy_accepted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index profiles_status_idx on public.profiles (status);
create index profiles_email_idx on public.profiles (email);

-- Single-row settings (public: logo, colors, welcome text) -------------------
create table public.community_settings (
  id smallint primary key default 1 check (id = 1),
  logo_path text,
  primary_color text check (primary_color ~ '^#[0-9a-fA-F]{6}$'),
  accent_color text check (accent_color ~ '^#[0-9a-fA-F]{6}$'),
  welcome_text text check (char_length(welcome_text) <= 5000),
  updated_at timestamptz not null default now()
);

-- Single-row payment details (approved members only) -------------------------
create table public.payment_details (
  id smallint primary key default 1 check (id = 1),
  account_holder text,
  bank_name text,
  account_number text,
  iban text,
  bic text,
  swish_number text,
  qr_path text,
  instructions text check (char_length(instructions) <= 5000),
  updated_at timestamptz not null default now()
);

-- Membership fee payments: one row per member and period ----------------------
create table public.membership_payments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles (id) on delete cascade,
  period_key text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reference text not null,
  status public.payment_status not null default 'unpaid',
  reported_at timestamptz,
  confirmed_at timestamptz,
  confirmed_by uuid references public.profiles (id) on delete set null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now(),
  unique (member_id, period_key)
);
create index membership_payments_period_idx on public.membership_payments (period_key, status);

-- Events ---------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  event_number integer generated always as identity unique,
  title text not null check (char_length(title) between 1 and 200),
  description text not null default '' check (char_length(description) <= 20000),
  location text check (char_length(location) <= 300),
  starts_at timestamptz not null,
  ends_at timestamptz,
  capacity integer check (capacity > 0),
  rsvp_deadline timestamptz,
  fee_amount numeric(10, 2) check (fee_amount >= 0),
  fee_currency text check (fee_currency ~ '^[A-Z]{3}$'),
  published boolean not null default false,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);
create index events_starts_at_idx on public.events (starts_at);

create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events (id) on delete cascade,
  member_id uuid not null references public.profiles (id) on delete cascade,
  status public.rsvp_status not null default 'going',
  payment_status public.payment_status,
  payment_reported_at timestamptz,
  payment_confirmed_at timestamptz,
  payment_confirmed_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id, member_id)
);
create index event_attendees_member_idx on public.event_attendees (member_id);

-- Announcements ----------------------------------------------------------------
create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  body text not null default '' check (char_length(body) <= 50000),
  pinned boolean not null default false,
  allow_comments boolean not null default true,
  published_at timestamptz,
  author_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index announcements_published_idx on public.announcements (published_at desc);

create table public.announcement_comments (
  id uuid primary key default gen_random_uuid(),
  announcement_id uuid not null references public.announcements (id) on delete cascade,
  author_id uuid references public.profiles (id) on delete set null default auth.uid(),
  body text not null check (char_length(body) between 1 and 5000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);
create index announcement_comments_announcement_idx on public.announcement_comments (announcement_id, created_at);

-- Privacy policy: versioned, one version holds every language ----------------
create table public.privacy_policies (
  version integer not null check (version > 0),
  locale text not null check (locale ~ '^[a-z]{2}$'),
  body text not null check (char_length(body) <= 100000),
  is_default boolean not null default false,
  published_at timestamptz not null default now(),
  published_by uuid references public.profiles (id) on delete set null,
  primary key (version, locale)
);

-- Email idempotency ------------------------------------------------------------
create table public.notification_log (
  id bigint generated always as identity primary key,
  kind text not null,
  ref_id text not null,
  recipient_id uuid,
  sent_at timestamptz not null default now(),
  unique nulls not distinct (kind, ref_id, recipient_id)
);

-- Triggers -------------------------------------------------------------------

-- Keep updated_at fresh on plain tables.
create function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger touch_events before update on public.events
  for each row execute function public.touch_updated_at();
create trigger touch_event_attendees before update on public.event_attendees
  for each row execute function public.touch_updated_at();
create trigger touch_announcements before update on public.announcements
  for each row execute function public.touch_updated_at();
create trigger touch_announcement_comments before update on public.announcement_comments
  for each row execute function public.touch_updated_at();
create trigger touch_community_settings before update on public.community_settings
  for each row execute function public.touch_updated_at();
create trigger touch_payment_details before update on public.payment_details
  for each row execute function public.touch_updated_at();

-- Create a pending profile whenever someone signs up. The display name, join message,
-- locale and accepted privacy policy version come from the sign-up form, via user metadata.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_name text := left(nullif(trim(meta ->> 'display_name'), ''), 80);
  v_privacy text := meta ->> 'privacy_version';
  v_locale text := meta ->> 'locale';
begin
  insert into public.profiles (id, email, display_name, join_message, locale, privacy_accepted_version, privacy_accepted_at)
  values (
    new.id,
    lower(new.email),
    coalesce(v_name, split_part(lower(new.email), '@', 1)),
    left(nullif(trim(meta ->> 'join_message'), ''), 2000),
    case when v_locale ~ '^[a-z]{2}$' then v_locale end,
    case when v_privacy ~ '^\d{1,6}$' then v_privacy::integer end,
    case when v_privacy ~ '^\d{1,6}$' then now() end
  );
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.email in sync when a user changes their email address.
create function public.handle_user_email_change() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = lower(new.email) where id = new.id;
  return new;
end $$;

create trigger on_auth_user_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function public.handle_user_email_change();

-- ─── 20261002000002_security.sql ───────────────────────────────────────────

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

-- ─── 20261002000003_functions.sql ──────────────────────────────────────────

-- ============================================================================
-- RPC functions that members call. They run with elevated rights but check
-- membership themselves, so the rules live in one place.
-- ============================================================================

-- RSVP to an event, or cancel. Returns 'going', 'cancelled', 'full' or 'closed'.
-- The event row is locked, so two members can't take the last seat at the same time.
create function public.rsvp_event(p_event_id uuid, p_going boolean) returns text
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_event public.events;
  v_taken integer;
begin
  if not public.is_member() then
    raise exception 'Only approved members can RSVP.' using errcode = '42501';
  end if;

  select * into v_event from public.events where id = p_event_id and published for update;
  if not found then
    raise exception 'Event not found.' using errcode = 'P0002';
  end if;

  if not p_going then
    update public.event_attendees set status = 'cancelled'
      where event_id = p_event_id and member_id = v_uid;
    return 'cancelled';
  end if;

  if v_event.starts_at <= now() or (v_event.rsvp_deadline is not null and v_event.rsvp_deadline < now()) then
    return 'closed';
  end if;

  if exists (select 1 from public.event_attendees where event_id = p_event_id and member_id = v_uid and status = 'going') then
    return 'going';
  end if;

  if v_event.capacity is not null then
    select count(*) into v_taken from public.event_attendees where event_id = p_event_id and status = 'going';
    if v_taken >= v_event.capacity then
      return 'full';
    end if;
  end if;

  insert into public.event_attendees (event_id, member_id, status, payment_status)
  values (
    p_event_id, v_uid, 'going',
    case when coalesce(v_event.fee_amount, 0) > 0 then 'unpaid'::public.payment_status end
  )
  on conflict (event_id, member_id) do update
    set status = 'going',
        payment_status = coalesce(public.event_attendees.payment_status, excluded.payment_status);
  return 'going';
end $$;

-- A member says "I've paid" for their membership fee. An admin then confirms it.
create function public.report_membership_payment(p_payment_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.membership_payments
    set status = 'reported', reported_at = now()
    where id = p_payment_id and member_id = auth.uid() and status = 'unpaid';
end $$;

-- A member says "I've paid" for an event fee.
create function public.report_event_payment(p_event_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.event_attendees
    set payment_status = 'reported', payment_reported_at = now()
    where event_id = p_event_id and member_id = auth.uid() and payment_status = 'unpaid';
end $$;

-- Number of members going, per event (members can't read other members' RSVP rows).
create function public.event_going_counts(p_event_ids uuid[])
returns table (event_id uuid, going integer)
language sql stable security definer set search_path = '' as $$
  select a.event_id, count(*)::integer
  from public.event_attendees a
  join public.events e on e.id = a.event_id
  where a.event_id = any (p_event_ids)
    and a.status = 'going'
    and (public.is_admin() or (public.is_member() and e.published))
  group by a.event_id;
$$;

-- Display names of the members going to an event, so members can see who else is coming.
create function public.event_attendee_names(p_event_id uuid)
returns table (display_name text)
language sql stable security definer set search_path = '' as $$
  select p.display_name
  from public.event_attendees a
  join public.events e on e.id = a.event_id
  join public.profiles p on p.id = a.member_id
  where a.event_id = p_event_id
    and a.status = 'going'
    and (public.is_admin() or (public.is_member() and e.published))
  order by a.created_at;
$$;

-- Only signed-in users may call these. Helpers stay callable by the RLS policies.
revoke execute on function
  public.rsvp_event(uuid, boolean),
  public.report_membership_payment(uuid),
  public.report_event_payment(uuid),
  public.event_going_counts(uuid[]),
  public.event_attendee_names(uuid)
from public, anon;
grant execute on function
  public.rsvp_event(uuid, boolean),
  public.report_membership_payment(uuid),
  public.report_event_payment(uuid),
  public.event_going_counts(uuid[]),
  public.event_attendee_names(uuid)
to authenticated;

revoke execute on function public.handle_new_user(), public.handle_user_email_change() from public, anon, authenticated;

-- ─── 20261002000004_storage.sql ────────────────────────────────────────────

-- ============================================================================
-- Storage: a public "branding" bucket for the logo and the payment QR code.
-- Anyone can view the files by URL. Only admins can upload or delete them.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('branding', 'branding', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

create policy "branding: admins read" on storage.objects
  for select to authenticated using (bucket_id = 'branding' and (select public.is_admin()));
create policy "branding: admins upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'branding' and (select public.is_admin()));
create policy "branding: admins update" on storage.objects
  for update to authenticated using (bucket_id = 'branding' and (select public.is_admin()));
create policy "branding: admins delete" on storage.objects
  for delete to authenticated using (bucket_id = 'branding' and (select public.is_admin()));

-- ─── 20261002000005_default_content.sql ────────────────────────────────────

-- ============================================================================
-- Default content: settings rows, schema version and a starter privacy policy.
-- In the policy text, {{community}}, {{contactEmail}} and {{siteUrl}} are filled
-- in when the page is shown. Admins should review the text in
-- Admin → Settings → Privacy policy. It is a starting point, not legal advice.
-- ============================================================================

insert into public.community_settings (id) values (1) on conflict do nothing;
insert into public.payment_details (id) values (1) on conflict do nothing;
insert into public.app_meta (key, value) values ('schema_version', '1')
  on conflict (key) do update set value = excluded.value;

insert into public.privacy_policies (version, locale, is_default, body) values
(1, 'en', true, $policy$
This privacy policy explains how **{{community}}** ("we") handles personal data on this website ({{siteUrl}}).

## Who is responsible
{{community}} is responsible for the personal data processed here. Contact us at **{{contactEmail}}** with any questions or requests about your data.

## What we collect
- **Account details:** your email address, display name, preferred language and, if you gave one, the message you wrote when you applied for membership.
- **Membership details:** your member number, membership status, your role (member or admin), and payment records (amount, reference, and whether a payment is reported or confirmed). We do **not** handle card or bank details; you pay us directly.
- **Activity:** events you sign up for, and comments you write.
- **Technical data:** cookies needed to keep you logged in and remember your language. We use no tracking or advertising cookies.

## Why we process it, and on what legal basis
- To manage your membership and the community's events (performance of the membership agreement).
- To send you login links and essential messages about your membership (performance of the membership agreement).
- To send you notifications about new events and announcements. You can turn these off on your profile page at any time (legitimate interest).
- To keep accounting records of fees (legal obligation, where it applies).

## Who can see your data
- **Admins** of {{community}} can see member details and payment status.
- **Other members** can see your display name when you comment or sign up for an event.
- **Service providers** that store and send data for us: Supabase (database and login), Vercel (website hosting), and our email provider. They act on our instructions only.

We never sell your data.

## How long we keep it
We keep your data while you are a member. If you delete your account, your personal data is deleted right away. Comments you wrote are kept as "former member" to keep conversations readable. Payment records may be kept longer where accounting law requires it.

## Your rights
You have the right to access, correct, export and delete your data, and to object to or restrict its processing. On your **profile page** you can:
- download all your data (export)
- change your name, language and email preferences
- delete your account

For anything else, email {{contactEmail}}. You can also complain to your national data protection authority.

## Changes
If we change this policy, we will show a notice when you next log in.
$policy$),
(1, 'sv', true, $policy$
Den här integritetspolicyn förklarar hur **{{community}}** ("vi") hanterar personuppgifter på den här webbplatsen ({{siteUrl}}).

## Vem som är ansvarig
{{community}} är personuppgiftsansvarig för de uppgifter som behandlas här. Kontakta oss på **{{contactEmail}}** med frågor om dina uppgifter.

## Vilka uppgifter vi samlar in
- **Kontouppgifter:** din e-postadress, ditt visningsnamn, ditt språkval och, om du skrev ett, meddelandet i din medlemsansökan.
- **Medlemsuppgifter:** ditt medlemsnummer, din medlemsstatus, din roll (medlem eller admin) och betalningsuppgifter (belopp, referens och om en betalning är rapporterad eller bekräftad). Vi hanterar **inga** kort- eller bankuppgifter; du betalar direkt till oss.
- **Aktivitet:** evenemang du anmäler dig till och kommentarer du skriver.
- **Teknisk information:** cookies som behövs för att hålla dig inloggad och komma ihåg ditt språk. Vi använder inga spårnings- eller reklamcookies.

## Varför vi behandlar uppgifterna och med vilken rättslig grund
- För att hantera ditt medlemskap och gemenskapens evenemang (fullgörande av medlemsavtalet).
- För att skicka inloggningslänkar och nödvändiga meddelanden om ditt medlemskap (fullgörande av medlemsavtalet).
- För att skicka aviseringar om nya evenemang och nyheter. Du kan stänga av dem på din profilsida när som helst (berättigat intresse).
- För att bokföra avgifter (rättslig förpliktelse, där sådan finns).

## Vem som kan se dina uppgifter
- **Admins** i {{community}} kan se medlemsuppgifter och betalningsstatus.
- **Andra medlemmar** kan se ditt visningsnamn när du kommenterar eller anmäler dig till ett evenemang.
- **Tjänsteleverantörer** som lagrar och skickar data åt oss: Supabase (databas och inloggning), Vercel (webbhotell) och vår e-postleverantör. De agerar endast enligt våra instruktioner.

Vi säljer aldrig dina uppgifter.

## Hur länge vi sparar uppgifterna
Vi sparar dina uppgifter så länge du är medlem. Om du raderar ditt konto raderas dina personuppgifter direkt. Kommentarer du skrivit sparas som "tidigare medlem" så att diskussionerna går att läsa. Betalningsuppgifter kan sparas längre om bokföringslagen kräver det.

## Dina rättigheter
Du har rätt att få tillgång till, rätta, exportera och radera dina uppgifter, samt att invända mot eller begränsa behandlingen. På din **profilsida** kan du:
- ladda ner alla dina uppgifter (export)
- ändra namn, språk och e-postinställningar
- radera ditt konto

För allt annat, mejla {{contactEmail}}. Du kan också klaga hos Integritetsskyddsmyndigheten (IMY) eller motsvarande myndighet i ditt land.

## Ändringar
Om vi ändrar policyn visar vi ett meddelande nästa gång du loggar in.
$policy$)
on conflict do nothing;
