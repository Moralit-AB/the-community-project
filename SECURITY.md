# Security policy

## Reporting a vulnerability

Please **do not open a public issue** for security problems.

Report vulnerabilities privately through GitHub: open the repository's **Security** tab and choose **Report a vulnerability**. This creates a private security advisory that only the maintainers can see. Include:

- what the problem is and where it is (file, route or SQL policy)
- how to reproduce it
- what an attacker could do with it

We aim to reply within 7 days, and to release a fix (with a note in the changelog) as soon as possible after that.

## If you run your own copy

- Keep your Supabase **secret key**, SMTP password and `CRON_SECRET` only in Vercel's environment variables and your local `.env.local`. They must never appear in git.
- Turn on GitHub **secret scanning** and **push protection** for your repository (Settings → Code security).
- Apply new database migrations when you update (see `docs/UPGRADING.md`). Security fixes sometimes ship as migrations.
- If a secret leaks: rotate it immediately (in Supabase → Project Settings → API Keys, at your email provider, or by changing `CRON_SECRET` in Vercel), then redeploy.
