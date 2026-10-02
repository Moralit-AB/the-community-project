// One-time local setup: starts Supabase in Docker, applies migrations and demo
// data, and writes .env.local. Safe to run again.
//
//   npm run setup:local            # start and write .env.local
//   npm run setup:local -- --reset # also wipe the local database and reseed it

import { execSync, spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

function run(cmd: string, args: string[]) {
  const res = spawnSync(cmd, args, { stdio: "inherit" });
  if (res.status !== 0) process.exit(res.status ?? 1);
}

// 1. Docker must be running for local Supabase.
if (spawnSync("docker", ["info"], { stdio: "ignore" }).status !== 0) {
  console.error(
    "\n✖ Docker is not running.\n  Install Docker Desktop (https://www.docker.com/products/docker-desktop/), start it, and run this again.\n",
  );
  process.exit(1);
}

// 2. Start Supabase. Migrations and seed are applied on the first start.
console.log("\n▶ Starting local Supabase (the first run downloads images and takes a few minutes)…\n");
run("npx", ["supabase", "start"]);
if (process.argv.includes("--reset")) {
  console.log("\n▶ Resetting the local database (migrations + demo data)…\n");
  run("npx", ["supabase", "db", "reset"]);
}

// 3. Read the local URLs and keys.
const status = JSON.parse(execSync("npx supabase status -o json", { encoding: "utf8" })) as Record<string, string>;
const publishable = status.PUBLISHABLE_KEY ?? status.ANON_KEY;
const secret = status.SECRET_KEY ?? status.SERVICE_ROLE_KEY;
if (!status.API_URL || !publishable || !secret) {
  console.error("✖ Could not read keys from `supabase status`. Is the Supabase CLI up to date?");
  process.exit(1);
}

// 4. Write .env.local, keeping any extra variables you added yourself.
const managed: Record<string, string> = {
  NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
  NEXT_PUBLIC_SUPABASE_URL: status.API_URL,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishable,
  SUPABASE_SECRET_KEY: secret,
  // founder@example.test is not in the seed: it shows how the very first admin of a new deployment logs in.
  ADMIN_EMAILS: "admin@example.test,founder@example.test",
  // Mailpit catches every email locally: http://localhost:54324
  SMTP_HOST: "127.0.0.1",
  SMTP_PORT: "54325",
  SMTP_USER: "",
  SMTP_PASS: "",
  SMTP_FROM: '"Community (local)" <noreply@example.test>',
};

const path = ".env.local";
const existing = existsSync(path) ? readFileSync(path, "utf8") : "";
const kept = existing
  .split("\n")
  .filter((line) => line.trim() && !line.startsWith("#"))
  .filter((line) => !(line.split("=")[0] in managed));
const cronSecret = /^CRON_SECRET=.+$/m.test(existing) ? [] : [`CRON_SECRET=${randomBytes(24).toString("hex")}`]; // secret-scan:allow (random, generated locally)

writeFileSync(
  path,
  [
    "# Written by `npm run setup:local` for LOCAL development. Never commit this file.",
    ...Object.entries(managed).map(([k, v]) => `${k}=${v.includes(" ") ? `'${v}'` : v}`),
    ...kept,
    ...cronSecret,
    "",
  ].join("\n"),
);

console.log(`
✔ Local setup complete.

  Next:   npm run dev
  App:    http://localhost:3000
  Login:  http://localhost:3000/dev/login     (one-click login as a demo user)
  Email:  ${status.MAILPIT_URL ?? status.INBUCKET_URL ?? "http://127.0.0.1:54324"}     (every email sent locally lands here)
  Studio: ${status.STUDIO_URL ?? "http://127.0.0.1:54323"}     (browse the database)

  Demo admin: admin@example.test (see supabase/seed.sql for all demo users)
`);
