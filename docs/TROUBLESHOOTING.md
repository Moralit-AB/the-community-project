# Troubleshooting

Start with **Admin → Setup check**: it detects most configuration problems and says how to fix them. If you can't log in at all, work through the sections below.

## Login

**No email arrives**
1. Check spam or junk.
2. In Supabase, open **Logs → Auth logs** and look for errors from around the time you tried.
3. Check **Authentication → Emails → SMTP Settings**: the host, port, username and password must match your provider, and the sender address must be on your verified domain.
4. In Resend, open **Emails** to see if the email was sent or bounced, and check that **Domains** shows the domain as *Verified*.
5. Too many attempts? Supabase limits how often emails can be sent. Wait a minute, and raise **Authentication → Rate Limits → emails per hour**.

**"That login link has expired or was already used"**
- Links can be used once and expire after one hour.
- Some email services (especially at workplaces) open links automatically to scan them, which uses up the link. Use the **6-digit code** from the same email instead: the login page shows a code field after you request a link.

**The login link opens localhost or the wrong address**
- Supabase → **Authentication → URL Configuration → Site URL** must be your live address.
- The email template must be the one from `supabase/templates/` (README step 6). It uses `{{ .SiteURL }}/auth/confirm`.

**I logged in but I'm not admin**
- `ADMIN_EMAILS` in Vercel must contain exactly the address you log in with. After changing it, **Redeploy**, then log out and back in. This works only while that account is still waiting for approval; if it is already an approved member, another admin must make it an admin in **Admin → Members**.

**"Your request has been received" for an existing member**
- That person's status is *pending*, *rejected* or *suspended*. An admin can change it under **Admin → Members**.

## Deployment

**The build fails: "community.config.ts is invalid"**
- The message lists each wrong field, e.g. `membership.fee.currency: must be a 3-letter currency code`. Fix it on GitHub; Vercel retries automatically.

**"Almost there: setup is incomplete"**
- The Supabase URL or publishable key is missing in Vercel. Add both, then **Redeploy**. Environment variable changes only apply after a redeploy.

**Setup check: "Database: schema v0"** or other database errors
- `supabase/setup.sql` hasn't been run, or it failed. Run it in the Supabase SQL editor (README step 3).

## Running

**Supabase project paused**
- Free projects pause after about a week with too little database activity. In the Supabase dashboard, open the project and click **Resume project**. The data is kept, and this works for up to a year.
- The daily job normally prevents it. **Admin → Setup check → Daily job ran recently** shows when it last ran. If it's red, make sure `CRON_SECRET` is set in Vercel, then check Vercel → your project → **Settings → Cron Jobs** and **Logs** for `/api/cron/daily`.
- For a second safeguard, see [Keeping the database awake](CONFIGURATION.md#keeping-the-database-awake).

**Admin shows "Your database may be paused soon"**
- The daily job hasn't run for 2 days or more. Fix it as described above. Supabase pauses after about a week, so there's time.

**Members don't get notification emails**
- **Admin → Setup check → Email sending (SMTP)** shows the error from your provider.
- Members may have turned notifications off on their profile page.
- `features.emailNotifications` must be `true` in `community.config.ts`.

**Wrong event times**
- Set `timezone` in `community.config.ts`. Existing events keep their absolute time, so edit and re-save them if they were entered with the wrong timezone.

## Locally (`npm run setup:local`)

- **"Docker is not running":** start Docker Desktop and wait until it says it's running.
- **Port already in use:** run `npm run db:stop`, or stop the other program using port 3000 / 54321–54324.
- **Login links point at port 3000 but the app runs on 3001:** change the port in the address bar, or free port 3000.
- **Start over:** `npm run setup:local -- --reset`.
