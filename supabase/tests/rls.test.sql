-- Security invariants. Run with `npm run db:test` (local Supabase must be running).
-- Uses the demo users from supabase/seed.sql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(20);

-- Helpers to act as a given user.
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.act_as_anon() returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  execute 'set local role anon';
end $$;

-- ─── Anonymous visitors ───────────────────────────────────────────────────────
select pg_temp.act_as_anon();
select is((select count(*) from public.community_settings)::int, 1, 'anon can read public settings');
select ok((select count(*) from public.privacy_policies) > 0, 'anon can read the privacy policy');
select throws_ok('select count(*) from public.profiles', '42501', null, 'anon cannot read profiles');
select throws_ok('select count(*) from public.events', '42501', null, 'anon cannot read events');
reset role;

-- ─── Pending applicant (Pat) ────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-4000-8000-000000000005');
select is((select count(*) from public.profiles)::int, 1, 'pending user sees only their own profile');
select is((select count(*) from public.events)::int, 0, 'pending user sees no events');
select is((select count(*) from public.payment_details)::int, 0, 'pending user cannot see payment details');
select is((select count(*) from public.announcements)::int, 0, 'pending user sees no announcements');
select throws_ok(
  $$update public.profiles set status = 'approved' where id = '00000000-0000-4000-8000-000000000005'$$,
  '42501', null, 'pending user cannot approve themselves');
reset role;

-- ─── Approved member (Robin) ───────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
select throws_ok(
  $$update public.profiles set role = 'admin' where id = '00000000-0000-4000-8000-000000000004'$$,
  '42501', null, 'member cannot make themselves admin');
select lives_ok(
  $$update public.profiles set display_name = 'Robin R' where id = '00000000-0000-4000-8000-000000000004'$$,
  'member can change their own display name');
select is(
  (select count(*) from public.profiles where id <> '00000000-0000-4000-8000-000000000004')::int, 0,
  'member cannot read other profiles directly');
select ok((select count(*) from public.member_names) >= 4, 'member can see other members'' display names');
select is((select count(*) from public.events where not published)::int, 0, 'member cannot see draft events');
select is((select count(*) from public.membership_payments)::int, 0, 'member only sees their own payments (Robin has none)');
select is(
  (select count(*) from public.event_attendees where member_id <> '00000000-0000-4000-8000-000000000004')::int, 0,
  'member cannot see other members'' RSVP rows');
select throws_ok(
  $$insert into public.events (title, starts_at, published) values ('Hack', now(), true)$$,
  '42501', null, 'member cannot create events');
select throws_ok(
  $$update public.announcement_comments set author_id = '00000000-0000-4000-8000-000000000004'$$,
  '42501', null, 'member cannot reassign comment authors');
reset role;

-- ─── Admin (Alex) ───────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.profiles)::int, 5, 'admin sees all profiles');
select throws_ok(
  $$update public.profiles set role = 'member' where id = '00000000-0000-4000-8000-000000000001'$$,
  'P0001', null, 'the last admin cannot be demoted');
reset role;

select * from finish();
rollback;
