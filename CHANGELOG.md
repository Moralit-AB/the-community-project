# Changelog

## 0.3.0 (unreleased)
Keeps a free Supabase project from pausing, however rarely members visit. **Database change:** run the new migration (see `docs/UPGRADING.md`).
- **Heartbeat:** the daily job records when it ran, first and on its own, and fails visibly in Vercel's logs if the database doesn't answer.
- **Early warning:** if the daily job hasn't run for 2 days, **Admin** shows a warning and the setup check shows **Daily job ran recently** in red. Supabase pauses after about a week.
- **Optional backup keep-alive:** a public `/api/health` page that runs one tiny database read. Point a free uptime monitor at it, or set `KEEPALIVE_URL` to turn on the included GitHub workflow.

## 0.2.0 (unreleased)
Security release. **Database change:** run the new migration (see `docs/UPGRADING.md`).
- **Dependencies:** Next.js 16.4.6 (fixes critical advisories, including remote code execution and Server Actions denial of service), zod 4.6.7, nodemailer 10.6.1.
- **No passwords:** Supabase Auth's public API accepted password sign-ups, so someone could register a member's or admin's address first and keep a working password after the owner confirmed it. Passwords are now never stored, and sessions created by password login are ignored.
- **Login rate limits** per visitor and per email address, so one person can't block everyone's logins or guess codes.
- **Comment moderation:** deleted comments can't be restored or edited, their text is visible to admins only, and suspended members can't edit their old comments.
- **`ADMIN_EMAILS`** only promotes an address at its first login. Removing or suspending an admin in the admin pages now sticks.
- People waiting for approval (or rejected) can download and delete their data from the waiting page.
- A Content-Security-Policy header, stricter validation of Server Action arguments, pinned GitHub Actions, and correct escaping of `;` in calendar files.

## 0.1.0 (unreleased)
First version:
- **Membership:** membership requests with admin approval, and passwordless login by magic link or code.
- **Fees:** membership fees with per-member payment references and admin confirmation.
- **Events:** RSVP, capacity limits, sign-up deadlines, optional fees, `.ics` files and reminders.
- **Announcements:** posts with comments.
- **Admin:** members, events, news, settings (logo, colours, payment details) and a setup check.
- **Privacy:** a versioned, editable policy with consent tracking, plus member data export and account deletion.
- **Languages:** English and Swedish.
