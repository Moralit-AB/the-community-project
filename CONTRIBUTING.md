# Contributing

Thanks for helping make community self-hosting easier!

## Ground rules
- **Configure, don't develop.** Features must work for every community, with options in `community.config.ts` or Admin → Settings. Don't hardcode names, languages, currencies or domains.
- **Security first.** Every table has row-level security. Database changes come with pgTAP tests (`supabase/tests/`).
- **Every text in every language.** Add new strings to all `messages/*.json` files. A test checks this.
- **Never commit secrets.** The pre-commit hook and CI scan for them. Don't bypass them.
- **Keep the README true.** If setup changes, update the README in the same pull request.

## Development setup
```bash
npm install            # also installs the git hooks
npm run setup:local    # Docker must be running
npm run dev
```
See [CLAUDE.md](CLAUDE.md) for architecture and conventions, and [HANDOFF.md](HANDOFF.md) for current status.

## Database changes
1. `npm run db:new <name>` creates `supabase/migrations/<timestamp>_<name>.sql`. Never edit a released migration.
2. In the migration, set `update public.app_meta set value = '<n>' where key = 'schema_version';` and bump `SCHEMA_VERSION` in `lib/schema-version.ts`.
3. `npm run db:reset && npm run db:test`
4. `npm run db:types` (TypeScript types) and `npm run db:setup-sql`
5. Add a row to the versions table in `docs/UPGRADING.md`.

## Before opening a pull request
```bash
npm run lint && npm run typecheck && npm test
npm run db:test && npm run e2e
```
