// Concatenates supabase/migrations/*.sql into supabase/setup.sql. Non-developers
// paste that one file into the Supabase SQL editor.
//
//   npm run db:setup-sql            # regenerate
//   npm run db:setup-sql -- --check # CI: fail if setup.sql is out of date

import { readdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "supabase", "migrations");
const out = join(process.cwd(), "supabase", "setup.sql");

const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const header = `-- =============================================================================
-- THE COMMUNITY PROJECT: DATABASE SETUP
--
-- Paste this whole file into Supabase → SQL Editor → "New query" and click "Run".
-- Run it ONCE on a new, empty project. To update an existing project, run only
-- the new migration files instead (see docs/UPGRADING.md).
--
-- GENERATED FILE: do not edit. Change supabase/migrations/ and run
-- \`npm run db:setup-sql\`.
-- =============================================================================
`;

const body = files
  .map(
    (f) => `\n-- ─── ${f} ${"─".repeat(Math.max(0, 70 - f.length))}\n\n${readFileSync(join(dir, f), "utf8").trim()}\n`,
  )
  .join("");

const sql = `${header}${body}`;

if (process.argv.includes("--check")) {
  const current = existsSync(out) ? readFileSync(out, "utf8") : "";
  if (current !== sql) {
    console.error("✖ supabase/setup.sql is out of date. Run `npm run db:setup-sql` and commit the result.");
    process.exit(1);
  }
  console.log("✔ supabase/setup.sql is up to date.");
} else {
  writeFileSync(out, sql);
  console.log(`✔ Wrote supabase/setup.sql from ${files.length} migration(s).`);
}
