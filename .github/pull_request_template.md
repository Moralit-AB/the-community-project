## What and why

## Checklist
- [ ] No secrets, keys or real member data in the diff
- [ ] New UI and email text is in **every** `messages/*.json` file
- [ ] Database changes are a **new** migration with RLS and pgTAP tests, `SCHEMA_VERSION` is bumped, `npm run db:setup-sql` is run, and `docs/UPGRADING.md` is updated
- [ ] README and docs updated if setup or configuration changed
- [ ] `npm run lint && npm run typecheck && npm test` pass (and `npm run db:test && npm run e2e` locally)
