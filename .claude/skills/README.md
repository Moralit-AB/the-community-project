# Project skills

This folder is for [Claude Code skills](https://docs.claude.com/en/docs/claude-code/skills) that are specific to this project. There are none yet. `CLAUDE.md` covers the core context.

Add a skill when a task keeps coming up and has steps that are easy to get wrong. Good candidates:

| Skill | What it would do |
|---|---|
| `add-locale` | Add a UI language: `messages/<locale>.json`, `community.config.ts` locales, the default privacy policy text in a migration |
| `add-migration` | Create an append-only migration, bump `SCHEMA_VERSION`, add RLS + pgTAP tests, regenerate `supabase/setup.sql`, update `docs/UPGRADING.md` |
| `release` | Bump the version, update `CHANGELOG.md` and `HANDOFF.md`, tag |

Each skill lives in its own folder with a `SKILL.md`:

```
.claude/skills/add-locale/SKILL.md
```

```markdown
---
name: add-locale
description: Add a new UI language to the platform
---

Step-by-step instructions…
```
