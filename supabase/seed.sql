-- ============================================================================
-- LOCAL DEMO DATA ONLY. This loads on `supabase db reset` / `npm run setup:local`.
-- It is never part of supabase/setup.sql, so production databases never get it.
--
-- Demo users (log in at http://localhost:3000/dev/login, or by magic link through Mailpit):
--   admin@example.test    Alex Admin      admin
--   maja@example.test     Maja Member     member, fee confirmed
--   sam@example.test      Sam Svensson    member, fee reported
--   robin@example.test    Robin Rivera    member, fee unpaid
--   pat@example.test      Pat Pending     pending applicant
-- ============================================================================

-- Users: inserting into auth.users fires the trigger that creates a pending profile.
with demo(id, email, name, message) as (values
  ('00000000-0000-4000-8000-000000000001'::uuid, 'admin@example.test', 'Alex Admin', null),
  ('00000000-0000-4000-8000-000000000002'::uuid, 'maja@example.test', 'Maja Member', null),
  ('00000000-0000-4000-8000-000000000003'::uuid, 'sam@example.test', 'Sam Svensson', null),
  ('00000000-0000-4000-8000-000000000004'::uuid, 'robin@example.test', 'Robin Rivera', null),
  ('00000000-0000-4000-8000-000000000005'::uuid, 'pat@example.test', 'Pat Pending',
    'Hi! A friend told me about your events and I''d love to join.')
)
insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change_token_new, email_change,
  email_change_token_current, phone_change, phone_change_token, reauthentication_token
)
select
  '00000000-0000-0000-0000-000000000000', id, 'authenticated', 'authenticated', email, '', now(),
  '{"provider":"email","providers":["email"]}',
  jsonb_build_object('display_name', name, 'join_message', message, 'privacy_version', '1'),
  now() - interval '60 days', now(),
  '', '', '', '', '', '', '', ''
from demo;

insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
select gen_random_uuid(), u.id, u.id::text,
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users u where u.email like '%@example.test';

-- Approve the admin first (member number 1), then the members.
update public.profiles set role = 'admin', status = 'approved' where email = 'admin@example.test';
update public.profiles set status = 'approved' where email = 'maja@example.test';
update public.profiles set status = 'approved' where email = 'sam@example.test';
update public.profiles set status = 'approved' where email = 'robin@example.test';

-- Settings and payment details
update public.community_settings set welcome_text =
  'Welcome! We meet a few times a month for picnics, workshops and good conversations. Everyone is welcome to apply.'
where id = 1;

update public.payment_details set
  account_holder = 'My Community',
  bank_name = 'Demo Bank',
  account_number = '1234-5 678 901 234',
  iban = 'SE00 0000 0000 0000 0000 0000',
  bic = 'DEMOSESS',
  swish_number = '123 456 78 90',
  instructions = 'Write your **payment reference** in the message field so we can match your payment.'
where id = 1;

-- Membership payments for the current calendar year (this matches the default config).
insert into public.membership_payments (member_id, period_key, amount, currency, reference, status, reported_at, confirmed_at, confirmed_by)
select p.id, extract(year from now())::text, 200, 'SEK',
  'MEM-' || p.member_number || '-' || extract(year from now())::text,
  s.status::public.payment_status,
  case when s.status in ('reported', 'confirmed') then now() - interval '5 days' end,
  case when s.status = 'confirmed' then now() - interval '3 days' end,
  case when s.status = 'confirmed' then '00000000-0000-4000-8000-000000000001'::uuid end
from public.profiles p
join (values ('maja@example.test', 'confirmed'), ('sam@example.test', 'reported'), ('admin@example.test', 'confirmed')) s(email, status)
  on s.email = p.email;

-- Events
insert into public.events (id, title, description, location, starts_at, ends_at, capacity, fee_amount, fee_currency, published, created_by) values
  ('00000000-0000-4000-9000-000000000001', 'Summer picnic',
   E'Bring something to share! We''ll have games, music and plenty of shade.\n\n- Blankets provided\n- Kids welcome',
   'City Park, by the big oak', date_trunc('day', now()) + interval '14 days 15 hours', date_trunc('day', now()) + interval '14 days 19 hours',
   null, null, null, true, '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-9000-000000000002', 'Bread-baking workshop',
   E'Learn to bake sourdough with our resident baker. **Only 3 places**, so sign up quickly.\n\nThe fee covers ingredients.',
   'Community kitchen', date_trunc('day', now()) + interval '30 days 17 hours', date_trunc('day', now()) + interval '30 days 20 hours',
   3, 100, 'SEK', true, '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-9000-000000000003', 'Spring meetup',
   'Our first meetup of the year. Thanks to everyone who came!',
   'The library café', date_trunc('day', now()) - interval '20 days' + interval '18 hours', null,
   null, null, null, true, '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-9000-000000000004', 'Autumn party (draft)',
   'Not published yet: only admins can see this.',
   'TBD', date_trunc('day', now()) + interval '60 days 18 hours', null,
   null, null, null, false, '00000000-0000-4000-8000-000000000001');

insert into public.event_attendees (event_id, member_id, status, payment_status) values
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000002', 'going', null),
  ('00000000-0000-4000-9000-000000000001', '00000000-0000-4000-8000-000000000003', 'going', null),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000002', 'going', 'confirmed'),
  ('00000000-0000-4000-9000-000000000002', '00000000-0000-4000-8000-000000000003', 'going', 'unpaid'),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000002', 'going', null),
  ('00000000-0000-4000-9000-000000000003', '00000000-0000-4000-8000-000000000004', 'going', null);

-- Announcements and comments
insert into public.announcements (id, title, body, pinned, allow_comments, published_at, author_id) values
  ('00000000-0000-4000-a000-000000000001', 'Welcome to our new community platform!',
   E'We''ve moved our community here so that **we** own our data, not a social network.\n\nHere you can:\n\n1. See and sign up for events\n2. Find payment details for your membership\n3. Read news like this one\n\nSay hi in the comments!',
   true, true, now() - interval '10 days', '00000000-0000-4000-8000-000000000001'),
  ('00000000-0000-4000-a000-000000000002', 'Workshop places are going fast',
   'Only one place left for the bread-baking workshop. Don''t forget to pay the ingredients fee.',
   false, true, now() - interval '2 days', '00000000-0000-4000-8000-000000000001');

insert into public.announcement_comments (announcement_id, author_id, body, created_at) values
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-8000-000000000002', 'Hi everyone! Love this 🎉', now() - interval '9 days'),
  ('00000000-0000-4000-a000-000000000001', '00000000-0000-4000-8000-000000000003', 'So much better than the group chat.', now() - interval '8 days');
