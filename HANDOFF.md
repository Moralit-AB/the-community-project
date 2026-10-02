# HANDOFF

A living status log for whoever picks up the work next, human or Claude. Update it at the end of every work session or build phase, and commit it.
**No secrets, keys, real member data or private deployment URLs in this file.** Use placeholders.

## Current status
**Phases 1–8 implemented and tested locally. Phase 9 (README, docs, CI) is next.**

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
- [ ] 9. Launch: README, docs, Deploy button, CI, CONTRIBUTING, issue templates

## What's next
- Phase 9: the step-by-step README for non-developers, docs/ (CONFIGURATION, UPGRADING, TROUBLESHOOTING, CONTRIBUTING), the CI workflow, issue templates and the Deploy button.

## Open decisions and known issues
- **Upstream repo URL:** needed for the README's "Use this template" and Deploy-button links. Placeholder: `<OWNER>/the-community-project`.
- **Changing your email address:** not supported in the UI in v1. An admin can change it in the Supabase dashboard (the `profiles.email` sync trigger handles it).
- **App icon:** generated from the community's initial and the config's primary color. It doesn't use the uploaded logo yet.
- **Payment QR code:** stored in the public `branding` bucket, so anyone with the URL can see it. That's acceptable for a payment QR code.

## How to verify
- `npm run setup:local -- --reset && npm run dev`, then open http://localhost:3000/dev/login.
- `npm test` (Vitest: config, periods, time zones, theme, CSV, translation key parity).
- `npm run db:test` (pgTAP: 20 RLS and security invariants).
- `npm run e2e` (Playwright: 14 flows, including real magic links and codes through Mailpit). If port 3000 is busy, set `E2E_BASE_URL`.
- `npm run lint && npm run typecheck && npm run build`.
- `npm run check:secrets`.

## Session log (newest first)
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
