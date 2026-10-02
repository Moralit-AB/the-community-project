@AGENTS.md

# The Community Project — guide for Claude

An open-source (MIT) **template** for running a small community: membership requests, magic-link login, membership-fee payment details, events with RSVP, announcements, and email notifications. Each community copies the repo, configures it and deploys it. **They should never have to write code.**

Current status and next steps are in **`HANDOFF.md`**. Read it at the start of a session and update it at the end of one.

## Principles
1. **Configure, don't develop.** Everything community-specific belongs in `community.config.ts`, env vars or the admin Settings page. Never hardcode a community name, domain, currency, language or copy.
2. **Data ownership and privacy.** Members can export and delete their data. The privacy policy is public and can be edited.
3. **Secure by default.** Row-level security (RLS) on every table. Role and status can be changed only by admins (enforced in the database, not only in the UI).
4. **Free tier first.** Vercel Hobby plus Supabase Free plus any SMTP provider. Don't add a dependency on a paid service.
5. **The README is a product.** A non-developer must be able to follow it from start to production. Update it whenever setup steps change.

## Stack
- **Next.js 16** (App Router, React 19, React Compiler, Turbopack), TypeScript, Tailwind CSS v4.
- **Supabase:**
  - Postgres with RLS.
  - Auth: email magic link through the PKCE `token_hash` flow, handled at `app/auth/confirm/route.ts`.
  - Storage: the public `branding` bucket.
- **next-intl** without locale URL prefixes. The locale comes from the `NEXT_LOCALE` cookie, then the profile, then `Accept-Language`, then the default. Messages are in `messages/<locale>.json`.
- **nodemailer** sends app emails over the same SMTP that Supabase Auth uses. Vercel Cron runs `/api/cron/daily`.
- **zod** for config, env and form validation. Server Actions for mutations.

## Where configuration lives
| What | Where | Changed by |
|---|---|---|
| Name, description, languages, timezone, membership fee, feature flags | `community.config.ts` (validated by `lib/config-schema.ts`) | git commit, then redeploy |
| Keys, SMTP, admin emails, site URL | env vars (`.env.example` lists them; read only through `lib/env.ts` / `lib/env-public.ts`) | Vercel settings, then redeploy |
| Logo, colors, welcome text, payment details, privacy policy | Database (`community_settings`, `payment_details`, `privacy_policies`) | Admin UI, live |

**Rule of thumb:** if it's a secret, use an env var. If it's structural (it changes behaviour or data), use the config file. If admins will want to tweak it often, use the database.

## Repo layout
```
community.config.ts     # the one file communities edit
app/
  (public)/             # landing, join, login, pending, privacy (no member gate)
  (app)/                # member area: home, membership, events, announcements, profile; layout calls requireMember()
  (app)/admin/          # admin area; layout calls requireAdmin()
  auth/confirm/         # magic-link landing (verifyOtp) + admin bootstrap + join notification
  api/cron/daily/       # event reminders (and keeps a free Supabase project active)
  dev/login/            # LOCAL-ONLY quick login (guarded: development + local Supabase)
components/             # ui/ primitives + feature components
lib/
  config*.ts env*.ts    # validated config / env
  supabase/             # server.ts, client.ts, admin.ts (secret key, server-only), proxy.ts
  auth.ts               # getCurrentUser, requireUser, requireMember, requireAdmin
  membership.ts time.ts theme.ts csv.ts
  email/                # send.ts (SMTP), templates.ts, notify.ts (who gets what)
messages/               # en.json, sv.json
supabase/
  migrations/           # append-only SQL, the source of truth for the schema
  setup.sql             # GENERATED: all migrations concatenated, for pasting into the Supabase SQL editor
  seed.sql              # local demo data (@example.test users)
  templates/            # auth email templates (magic link / confirm signup)
  tests/                # pgTAP RLS tests
scripts/                # setup-local, build-setup-sql, check-secrets
e2e/                    # Playwright flows (real magic links via the Mailpit API)
docs/                   # CONFIGURATION, UPGRADING, TROUBLESHOOTING, screenshots/
public/brand/           # The Community Project mark (svg/png): default logo; app/icon.svg, favicon.ico, apple-icon.png and public/icons/ derive from it
.github/workflows/      # ci.yml (checks, secret scan, e2e on PRs); template-sync.yml (updates for copies)
```

## Data model (see `supabase/migrations/`)
| Table | Contents |
|---|---|
| `profiles` | Created by a trigger on `auth.users` with `status = pending`. `role` is member or admin; `status` is pending, approved, rejected or suspended. `member_number` is assigned when the member is approved. |
| `community_settings` | Public: logo, colors, welcome text |
| `payment_details` | Approved members only |
| `membership_payments` | One row per member per fee period. Status is unpaid, reported, confirmed or waived. |
| `events`, `event_attendees` | RSVPs go through the `rsvp_event` RPC, which enforces capacity with a row lock |
| `announcements`, `announcement_comments` | Comments are soft-deleted |
| `privacy_policies` | Versioned; one version holds all locales |
| `notification_log` | Makes emails idempotent |
| `app_meta` | `schema_version` |

**Security invariants (pgTAP tests in `supabase/tests/` must keep them true):**
- A trigger blocks non-admins from changing `profiles.role`, `status`, `member_number`, `approved_*` and `email`.
- The last approved admin can't be demoted, suspended or deleted.
- Helper functions `is_admin()` and `is_member()` are `SECURITY DEFINER` with `search_path = ''`.
- Pending users can read only their own profile.
- `lib/supabase/admin.ts` (secret key, bypasses RLS) is server-only. Use it only after an explicit permission check, and only for things RLS can't express: bootstrap, sending emails, deleting accounts, the setup check.

## Conventions
- **Mutations** are Server Actions in `actions.ts` files next to their pages. Validate input with zod. Check permissions with `requireMember()` or `requireAdmin()` even though RLS also enforces them.
- **Strings:**
  - All UI and email text goes through next-intl. Add each key to **every** file in `messages/`.
  - Dates are formatted in `config.timezone` via `lib/time.ts`.
- **Migrations:**
  - Never edit a migration once it has been released. Add a new file `supabase/migrations/<timestamp>_<name>.sql` instead.
  - Bump `SCHEMA_VERSION` in `lib/schema-version.ts` and update `app_meta` in the migration.
  - Run `npm run db:setup-sql`.
  - Document it in `docs/UPGRADING.md`.
- **New tables:** enable RLS and add policies and pgTAP tests in the same change.
- **Security of user content:**
  - Render markdown with `components/markdown.tsx`; raw HTML is disabled.
  - Escape user content in emails (`escapeHtml`).
  - Guard CSV cells against formulas (`lib/csv.ts`).
- **ADMIN_EMAILS:** these addresses may create an account from `/login`, so the very first admin can just log in. They are promoted in `lib/post-login.ts`.
- **Style:** keep it simple and readable. Small server components, client components only where needed for interactivity.

## Commands
```bash
npm run setup:local    # first time: starts local Supabase (Docker), applies migrations + seed, writes .env.local
npm run dev            # http://localhost:3000; emails at http://localhost:54324 (Mailpit); Studio at :54323
npm run db:reset       # rebuild local DB from migrations + seed
npm run db:setup-sql   # regenerate supabase/setup.sql after changing migrations
npm run db:test        # pgTAP RLS tests (local Supabase must be running)
npm test               # Vitest unit tests
npm run e2e            # Playwright end-to-end (local Supabase + dev server)
npm run lint && npm run typecheck
npm run check:secrets  # scan all tracked files for secrets
```

## Secrets — non-negotiable
- **Never commit** `.env*` files (except `.env.example` with placeholders), keys, tokens, passwords, real member data or private deployment URLs. This applies to every file, including `HANDOFF.md` and docs.
- **Enforcement:**
  - The lefthook pre-commit hook runs `scripts/check-secrets.mjs` (plus gitleaks when installed).
  - CI runs the same scan and gitleaks.
  - Don't bypass these checks (`--no-verify`).
- **Code rules:**
  - Secret env vars are read only in `lib/env.ts`, which imports `server-only`.
  - Never log secrets.
  - The setup-check page shows whether a variable is set, never its value.
- Use placeholders like `<SUPABASE_URL>` in docs.
