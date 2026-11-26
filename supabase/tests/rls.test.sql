-- Security invariants. Run with `npm run db:test` (local Supabase must be running).
-- Uses the demo users from supabase/seed.sql.
begin;
create extension if not exists pgtap with schema extensions;
select plan(38);

-- Helpers to act as a given user.
create or replace function pg_temp.act_as(uid uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', uid, 'role', 'authenticated')::text, true);
  execute 'set local role authenticated';
end $$;

create or replace function pg_temp.act_as_trusted() returns void language plpgsql as $$
begin
  execute 'reset role';
  perform set_config('request.jwt.claims', '{}', true);
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

-- ─── Comment moderation ────────────────────────────────────────────────────────
-- Maja (…02) deletes her own comment.
select pg_temp.act_as('00000000-0000-4000-8000-000000000002');
select lives_ok(
  $$update public.announcement_comments set deleted_at = now()
    where author_id = '00000000-0000-4000-8000-000000000002'$$,
  'author can delete their own comment');
select is(
  (select body from public.announcement_comments where author_id = '00000000-0000-4000-8000-000000000002'), '',
  'a deleted comment has no text');
select throws_ok(
  $$update public.announcement_comments set deleted_at = null
    where author_id = '00000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'author cannot restore a deleted comment');
select throws_ok(
  $$update public.announcement_comments set body = 'edited'
    where author_id = '00000000-0000-4000-8000-000000000002'$$,
  '42501', null, 'author cannot edit a deleted comment');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
select is((select count(*) from public.announcement_comment_archive)::int, 0,
  'members cannot read deleted comment text');
select lives_ok(
  $$insert into public.announcement_comments (announcement_id, body, deleted_at)
    values ('00000000-0000-4000-a000-000000000001', 'sneaky', now())$$,
  'member can post a comment');
select ok(
  (select deleted_at is null from public.announcement_comments where body = 'sneaky'),
  'a new comment cannot start out deleted');
reset role;

select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
select is(
  (select body from public.announcement_comment_archive limit 1), 'Hi everyone! Love this 🎉',
  'admins can read deleted comment text');
reset role;

-- Sam (…03) is suspended.
select pg_temp.act_as_trusted();
update public.profiles set status = 'suspended' where id = '00000000-0000-4000-8000-000000000003';
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
update public.announcement_comments set body = 'changed' where author_id = '00000000-0000-4000-8000-000000000003';
reset role;
select pg_temp.act_as_trusted();
select is(
  (select body from public.announcement_comments where author_id = '00000000-0000-4000-8000-000000000003'),
  'So much better than the group chat.', 'suspended member cannot edit their comments');
select pg_temp.act_as('00000000-0000-4000-8000-000000000003');
select throws_ok(
  $$select public.report_event_payment('00000000-0000-4000-9000-000000000002')$$,
  '42501', null, 'suspended member cannot report a payment');
reset role;

-- ─── Server-only tables ─────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
select throws_ok($$select public.rate_limit_hit('x', 1, 60)$$, '42501', null,
  'members cannot call the rate limiter');
select throws_ok('select count(*) from public.rate_limits', '42501', null, 'members cannot read rate limits');
select throws_ok('select public.heartbeat()', '42501', null, 'members cannot record a heartbeat');
reset role;

-- ─── Heartbeat (the daily job) ─────────────────────────────────────────────────
select pg_temp.act_as_trusted();
select isnt(public.heartbeat(), null, 'the server can record a heartbeat');
select pg_temp.act_as('00000000-0000-4000-8000-000000000004');
select is(public.last_heartbeat(), null, 'members cannot see the last heartbeat');
reset role;
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
select is(public.last_heartbeat(), now(), 'admins see when the daily job last ran');
reset role;
select pg_temp.act_as_anon();
select throws_ok('select public.last_heartbeat()', '42501', null, 'anon cannot call last_heartbeat');
reset role;

-- ─── Admin (Alex) ───────────────────────────────────────────────────────────────
select pg_temp.act_as('00000000-0000-4000-8000-000000000001');
select is((select count(*) from public.profiles)::int, 5, 'admin sees all profiles');
select throws_ok(
  $$update public.profiles set role = 'member' where id = '00000000-0000-4000-8000-000000000001'$$,
  'P0001', null, 'the last admin cannot be demoted');
reset role;

-- ─── No passwords ───────────────────────────────────────────────────────────────
select pg_temp.act_as_trusted();
insert into auth.users (id, email, encrypted_password, aud, role)
values ('00000000-0000-4000-8000-0000000000ff', 'pw@example.test', '$2a$10$abcdefghijklmnopqrstuv', 'authenticated', 'authenticated');
select is((select encrypted_password from auth.users where id = '00000000-0000-4000-8000-0000000000ff'), '',
  'passwords are never stored');

select * from finish();
rollback;
