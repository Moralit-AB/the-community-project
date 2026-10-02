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
