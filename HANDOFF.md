# HANDOFF

A living status log for whoever picks up the work next, human or Claude. Update it at the end of every work session or build phase, and commit it.
**No secrets, keys, real member data or private deployment URLs in this file.** Use placeholders.

## Current status
**All build phases (0–9) are done and tested locally. The repo is published at github.com/Moralit-AB/the-community-project as a public template. Next: rehearse the README on real cloud accounts, then the user does the acceptance run.**

## Build phases
- [x] 0. Repo hygiene: gitignore, secret scanning, CLAUDE.md, HANDOFF.md, SECURITY.md, LICENSE
- [x] 1. Scaffold, runnable locally: Supabase CLI config, `setup:local`, Next 16, Tailwind, next-intl, config schema, Supabase clients, proxy, theming, base layout
- [x] 2. Database: migrations, RLS, triggers, storage, pgTAP tests, `setup.sql` builder
- [x] 3. Auth and membership requests: join, login, confirm, pending, admin bootstrap, admin members list with approve/reject
- [x] 4. Membership fees and payment details: settings, `/membership`, admin payment tracking, CSV export
- [x] 5. Events: CRUD, RSVP with capacity, event fees, attendees, `.ics`
- [x] 6. Announcements and comments
- [x] 7. Email: SMTP sender, templates, preferences, cron reminders
- [x] 8. Privacy policy, profile and GDPR, setup check page, PWA manifest and icons
- [x] 9. Launch: README, docs, Deploy button, CI, CONTRIBUTING, issue templates

## What's next
1. **Rehearse the README** end to end on a fresh Supabase project, Vercel project and email provider. Fix any step that's unclear, and add dashboard screenshots where people might get stuck.
2. **User acceptance:** copy the template privately, follow only the README, and launch the friend's community.

## Open decisions and known issues
- **Changing your email address:** not supported in the UI in v1. An admin can change it in the Supabase dashboard (the `profiles.email` sync trigger handles it).
- **Icons:** the browser-tab, home-screen and fallback-header icons are The Community Project's mark (`public/brand/`, `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png`, `public/icons/`). A logo uploaded in Admin → Settings replaces the mark in the header, but not in the browser tab or home-screen icon yet (a possible v2 feature). `app/icon.svg` is the provided SVG as-is. Its 9th dot is white, which shows up as an extra dot on dark browser tab bars.
- **Payment QR code:** stored in the public `branding` bucket, so anyone with the URL can see it. That's acceptable for a payment QR code.

## How to verify
- `npm run setup:local -- --reset && npm run dev`, then open http://localhost:3000/dev/login.
- `npm test` (Vitest: config, periods, time zones, theme, CSV, translation key parity).
- `npm run db:test` (pgTAP: 33 RLS and security invariants; needs fresh seed data, so run `npm run db:reset` first if you just ran e2e).
- `npm run e2e` (Playwright: 18 flows, including real magic links and codes through Mailpit). It resets the local database to fresh demo data first (`E2E_SKIP_DB_RESET=1` skips that). If port 3000 is busy, set `E2E_BASE_URL`.
- `npm run lint && npm run typecheck && npm run build`.
- `npm run check:secrets`.

## Session log (newest first)
### 2026-11-26 (security review, v0.2.0, schema v2)
- Security review of the whole repo; fixes on branch `security-hardening` (not committed yet).
- Dependencies: Next 16.4.6 (critical advisories in 16.3.8), zod, nodemailer, dev-only vite and minimatch. `npm audit` is clean.
- Migration `20261126000001_security_hardening.sql`:
  - A trigger on `auth.users` clears `encrypted_password`. Reproduced locally first: a password sign-up through the public Auth API kept working after the real owner confirmed the address by code (account pre-hijacking). `lib/auth.ts` also ignores sessions whose `amr` says `password`.
  - Comments: deleting moves the text to the admin-only `announcement_comment_archive` and empties `body`. Deleted comments can't be edited or restored, new comments can't start out deleted, and authors must be approved members to edit.
  - `report_*_payment` require an approved member.
  - `rate_limits` table plus `rate_limit_hit()` (service role only), used by `lib/rate-limit.ts` in the login actions. Keys are HMAC hashes of IP and email. The cron job cleans up old windows.
- `ADMIN_EMAILS` only promotes a profile that is still pending (first login), so demotions and suspensions stick.
- Pending and rejected users can export and delete their data on `/pending` (`components/account-data.tsx`).
- CSP header, zod checks for bound Server Action arguments (`lib/validation.ts`), Actions and gitleaks pinned to SHAs/digest, `.ics` `;` escaping.
- README: raise Supabase's "sign ups and sign ins" and "token verifications" rate limits, because every login comes from the server's IP.
- Open: the GDPR export doesn't include a member's own archived (deleted) comment text. The text of deleted accounts' comments is kept, anonymised.
### 2026-11-26 (publish)
- Published the repo publicly at `Moralit-AB/the-community-project` and marked it as a template. Replaced the `<OWNER>` placeholders.
- LICENSE now names Moralit AB. CI's typecheck runs `next typegen` first, because the route type helpers (`PageProps`, `LayoutProps`, `RouteContext`) didn't exist on a fresh checkout.
- Moved to Node 26 LTS (supported until 2029-04-30): `.nvmrc`, `engines.node: 26.x` (Vercel uses it for builds and functions), `@types/node` 26, the README prerequisites, and GitHub Actions checkout, setup-node and upload-artifact v7.
- `npm run e2e` now resets the local database first (`e2e/global-setup.ts`), because stale demo data made the tests fail: seeded events are dated relative to the seed time.
### 2026-10-02 (branding)
- Replaced the generated letter icon with The Community Project mark: SVG favicon, `.ico` fallback, Apple touch icon, manifest icons (192, 512 and maskable 512), and the fallback logo in the header and footer (inverted in dark mode). Raster icons are made from the provided PNG with ImageMagick.
### 2026-10-02 (phase 9)
- README, written step by step for non-developers: costs and limits, Supabase, Resend/SMTP, email templates, config, Vercel, URL configuration, first admin, custom domain, "Am I done?" checklist, local try-out, troubleshooting.
- docs/: CONFIGURATION, UPGRADING (template-sync workflow plus manual path, database migration steps), TROUBLESHOOTING, screenshots.
- CI: lint, typecheck, unit tests, `setup.sql` freshness check, build, secret scan (built-in scanner plus gitleaks over full history), pgTAP and Playwright on pull requests.
- Fixes:
  - The first admin can log in from `/login` (`ADMIN_EMAILS` may create an account).
  - A fee isn't shown as overdue for members who joined mid-period.
  - Period dates are anchored to local midnight in the community's timezone.
  - The accent colour is used for "Pinned" badges.
  - Language names live in one place.
### 2026-10-02 (cont.)
- Built phases 1–8:
  - Database: migrations with RLS, protected profile fields, last-admin guard, RPCs for RSVP and payment reporting, storage bucket, default en/sv privacy policy.
  - Public pages: landing, join, login (magic link and code), pending, privacy.
  - Member area: home, membership fee with reference, events with RSVP, capacity, event fees and `.ics`, announcements with comments, profile with data export and account deletion.
  - Admin: members (approve/reject/suspend/roles/payments/CSV), events (CRUD, attendees, payments, CSV), announcements, settings (logo, colors, payment details, QR code), privacy policy editor with versions, setup check.
  - Email notifications over SMTP with idempotency. Daily cron for reminders.
- Local development: `npm run setup:local` writes `.env.local` from `supabase status`. Seed data with demo users. `/dev/login` works only in development against a local Supabase.
- Tests are green: Vitest 15, pgTAP 20, Playwright 14.
### 2026-10-02
- Planned the project from the wonderburn/underjorden investigation. The approved plan covers stack, scope, the configuration split, local development and acceptance criteria.
- Scaffolded Next 16.3 with create-next-app and installed dependencies.
- Added the secret-scanning pre-commit hook (lefthook running `scripts/check-secrets.mjs`, plus gitleaks when installed), `.env.example`, LICENSE, SECURITY.md, CLAUDE.md and this file.
