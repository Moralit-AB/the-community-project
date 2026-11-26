# Keeping your copy up to date

Your copy of The Community Project doesn't update by itself. There are two ways to pull in new versions.

## Option A: automatic pull requests (recommended)

Your repository includes `.github/workflows/template-sync.yml`. Once a month, it opens a pull request with the latest changes from the original project.

**One-time setup, in your repository on GitHub:**

1. **Settings → Secrets and variables → Actions → Variables tab → New repository variable**
   - Name: `UPSTREAM_REPO`
   - Value: `Moralit-AB/the-community-project` (the original project)
2. **Settings → Actions → General → Workflow permissions:** tick **Allow GitHub Actions to create and approve pull requests** → **Save**.
3. Optional, to run it right away: **Actions → Update from The Community Project → Run workflow**.

**When a pull request arrives:**

1. Read its description and check this file (in the pull request) for **database changes** (see below).
2. Click **Merge pull request**. Vercel deploys the new version.
3. If there were database changes, run them as described below.
4. Check **Admin → Setup check**.

Your `community.config.ts` is never overwritten (see `.templatesyncignore`).

## Option B: manually with git

```bash
git remote add upstream https://github.com/Moralit-AB/the-community-project.git   # once
git fetch upstream
git merge upstream/main --allow-unrelated-histories   # the flag is only needed the first time
# resolve any conflicts (usually only community.config.ts: keep your values), then:
git push
```

## Database changes

Some versions change the database. **Admin → Setup check** shows "Database: schema vX / expected vY" when your database is behind.

For each new file in `supabase/migrations/` (the version list below says which):

1. Open the file on GitHub and copy its contents.
2. In Supabase, go to **SQL Editor → New query**, paste the contents and click **Run**.
3. Run the files in order (oldest first, by file name).

Developers can instead run `npx supabase link --project-ref <ref>` once, then `npx supabase db push`.

## Versions

| Version | Schema | Database changes to run |
|---|---|---|
| 0.1.0 | v1 | None. This is the initial version: run `supabase/setup.sql` once when setting up. |
| 0.2.0 | v2 | `supabase/migrations/20261126000001_security_hardening.sql` (security fixes, **apply it as soon as possible**). Also raise two Supabase rate limits: see README step "Rate Limits". |
