# Configuration reference

There are three places to configure your community:

| Where | What | How to change |
|---|---|---|
| `community.config.ts` | Name, description, languages, timezone, membership fee, features | Edit on GitHub. Vercel redeploys automatically. |
| Environment variables | Keys, email (SMTP), admins, site address | Vercel → Settings → Environment Variables, then Redeploy |
| Admin → Settings | Logo, colours, welcome text, payment details, privacy policy | In the app. Changes apply immediately. |

## `community.config.ts`

If a value is invalid, the deployment fails with a message that names the field, so a mistake can never take down the live site.

| Setting | Example | Meaning |
|---|---|---|
| `name` | `"Södermalm Book Club"` | Shown in the header, browser tab and emails |
| `shortName` | `"Book Club"` | Name under the icon when added to a phone's home screen (max 24 characters) |
| `description` | `{ en: "…", sv: "…" }` or `"…"` | Text on the start page. One text, or one per language. |
| `contactEmail` | `"hello@example.org"` | Public contact address (footer, privacy policy, emails) |
| `locales` | `["en", "sv"]` | Languages members can choose. See [Adding a language](#adding-a-language). |
| `defaultLocale` | `"sv"` | Used when a visitor's browser language isn't one of `locales` |
| `timezone` | `"Europe/Stockholm"` | Event times are entered and shown in this timezone ([list](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)) |
| `membership.requireApproval` | `true` | `true`: an admin approves each request. `false`: anyone who confirms their email becomes a member. |
| `membership.joinMessage` | `"optional"` | Ask applicants for a message: `"off"`, `"optional"` or `"required"` |
| `membership.fee.amount` | `200` | The fee per period. `0` means membership is free. |
| `membership.fee.currency` | `"SEK"` | 3-letter currency code |
| `membership.fee.period` | `"year"` | `"year"`, `"half-year"`, `"quarter"`, `"month"` or `"none"` |
| `membership.fee.periodStartMonth` | `1` | Month the period starts (e.g. `9` for September to August) |
| `membership.fee.graceDays` | `30` | Days after the period starts (or after a new member is approved) before an unpaid fee shows as *overdue* |
| `membership.referencePrefix` | `"MEM"` | Payment references look like `MEM-12-2026` (member 12, period 2026), or `MEM-12-E3` for event 3 |
| `features.announcements` | `true` | Turn the News section on or off |
| `features.comments` | `true` | Let members comment on news |
| `features.emailNotifications` | `true` | Emails about new events, news and reminders. Login emails and emails about membership decisions are always sent. |
| `theme.primary`, `theme.accent` | `"#4f46e5"` | Starting colours, until an admin picks colours in Settings |

### How membership fees work

- At the start of each period (e.g. each calendar year), every member's membership page shows the fee, your payment details and a personal **reference**.
- Members pay you directly (bank transfer, Swish, …) using that reference, then click **I've paid**.
- Admins match the payment against the bank and click **Confirm paid**.

Nothing is charged automatically, and the platform never sees card or bank details.

**Changing the fee:** edit `amount` and redeploy. Members who already have a record for the current period keep their old amount; the new amount applies to new records and the next period.

## Environment variables

| Name | Secret? | Description |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | no | Your site's full address, without a trailing slash |
| `NEXT_PUBLIC_SUPABASE_URL` | no | Supabase → Project Settings → Data API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | no | Supabase → Project Settings → API Keys → Publishable key |
| `SUPABASE_SECRET_KEY` | **yes** | Supabase → Project Settings → API Keys → Secret key. Bypasses all security rules, so keep it safe. |
| `ADMIN_EMAILS` | yes* | Comma-separated. These addresses become admins when they log in. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER` | yes* | Your email provider's SMTP server (port 465 = SSL, 587 = STARTTLS) |
| `SMTP_PASS` | **yes** | SMTP password or API key |
| `SMTP_FROM` | no | Sender, e.g. `My Community <hello@example.org>` |
| `CRON_SECRET` | **yes** | Random string. Protects the daily job at `/api/cron/daily`. |

\*Not dangerous on their own, but keep them out of git anyway.

The daily job runs at 07:00 UTC (see `vercel.json`). It sends reminders for events starting within the next 24 hours.

## Admin → Settings

- **Logo:** PNG, JPG or WebP, max 2 MB. A wide logo with a transparent background looks best. Until you upload one, the header shows The Community Project's mark. The browser-tab and home-screen icons always use the mark. To use your own, replace `app/icon.svg`, `app/favicon.ico`, `app/apple-icon.png` and the files in `public/icons/` with your versions, keeping the same file names and sizes.
- **Colours:**
  - Main colour: buttons, links and highlights.
  - Accent colour: highlights such as the "Pinned" label.
  - The text colour on buttons is picked automatically for readability.
- **Welcome text:** shown on the public start page (Markdown supported).
- **Payment details:** only approved members can see them. Fill in only what you use.
- **Privacy policy:**
  - Every publish creates a new version, and members are asked to read it.
  - `{{community}}`, `{{contactEmail}}` and `{{siteUrl}}` are filled in automatically.

## Adding a language

English (`en`) and Swedish (`sv`) are included. Adding another language needs a small code change, which a developer can do in about an hour:

1. Copy `messages/en.json` to `messages/<code>.json` (e.g. `de.json`) and translate the values (not the keys).
2. In `lib/config-schema.ts`, add the code to `SUPPORTED_LOCALES` and its name to `LANGUAGE_NAMES`.
3. Add a translated login email template in `supabase/templates/`.
4. Add it to `locales` in `community.config.ts`, then publish the privacy policy in that language under Admin → Settings → Privacy policy.

`npm test` checks that every language has exactly the same keys as English.
