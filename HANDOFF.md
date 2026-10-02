# HANDOFF

A living status log for whoever picks up the work next, human or Claude. Update it at the end of every work session or build phase, and commit it.
**No secrets, keys, real member data or private deployment URLs in this file.** Use placeholders.

## Current status
**Phase 0: repo hygiene.** In progress.

## Build phases
- [x] 0. Repo hygiene: gitignore, secret scanning, CLAUDE.md, HANDOFF.md, SECURITY.md, LICENSE
- [ ] 1. Scaffold, runnable locally: Supabase CLI config, `setup:local`, Next 16, Tailwind, next-intl, config schema, Supabase clients, proxy, theming, base layout
- [ ] 2. Database: migrations, RLS, triggers, storage, pgTAP tests, `setup.sql` builder
- [ ] 3. Auth and membership requests: join, login, confirm, pending, admin bootstrap, admin members list with approve/reject
- [ ] 4. Membership fees and payment details: settings, `/membership`, admin payment tracking, CSV export
- [ ] 5. Events: CRUD, RSVP with capacity, event fees, attendees, `.ics`
- [ ] 6. Announcements and comments
- [ ] 7. Email: SMTP sender, templates, preferences, cron reminders
- [ ] 8. Privacy policy, profile and GDPR, setup check page, PWA manifest and icons
- [ ] 9. Launch: README, docs, Deploy button, CI, CONTRIBUTING, issue templates

## What's next
- Phase 1: local Supabase config, `setup:local`, i18n, config schema, Supabase clients, proxy, theming, base layout.

## Open decisions and known issues
- None yet.

## How to verify
- `node scripts/check-secrets.mjs --all` passes.

## Session log (newest first)
### 2026-10-02
- Planned the project from the wonderburn/underjorden investigation. The approved plan covers stack, scope, the configuration split, local development and acceptance criteria.
- Scaffolded Next 16.3 with create-next-app and installed dependencies.
- Added the secret-scanning pre-commit hook (lefthook running `scripts/check-secrets.mjs`, plus gitleaks when installed), `.env.example`, LICENSE, SECURITY.md, CLAUDE.md and this file.
