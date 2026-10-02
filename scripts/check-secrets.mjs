#!/usr/bin/env node
// Blocks commits that would leak secrets.
//
//   node scripts/check-secrets.mjs          # scan staged files (pre-commit hook)
//   node scripts/check-secrets.mjs --all    # scan every tracked file (CI)
//
// Uses gitleaks as well when it is installed. The built-in patterns below always run,
// so the check works even on machines without gitleaks.
// To allow a false positive, put `secret-scan:allow` on the same line.

import { execFileSync, spawnSync } from "node:child_process";

const scanAll = process.argv.includes("--all");

const FORBIDDEN_FILES = [
  { test: (f) => /(^|\/)\.env(\..+)?$/.test(f) && !f.endsWith(".env.example"), why: "env file" },
  { test: (f) => /\.(pem|key|p12|pfx)$/i.test(f), why: "private key / certificate" },
  { test: (f) => /(^|\/)signing_keys\.json$/.test(f), why: "JWT signing keys" },
  { test: (f) => /(^|\/)service-account.*\.json$/.test(f), why: "service account credentials" },
];

const PATTERNS = [
  { name: "Supabase secret key", re: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: "JSON Web Token", re: /eyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/ },
  { name: "Resend API key", re: /\bre_[A-Za-z0-9]{8,}_[A-Za-z0-9]{16,}/ },
  { name: "Private key block", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----/ },
  { name: "AWS access key id", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "Slack token", re: /\bxox[abpr]-[A-Za-z0-9-]{10,}/ },
  { name: "Stripe secret key", re: /\b[sr]k_live_[A-Za-z0-9]{16,}/ },
  { name: "Postgres URL with password", re: /postgres(ql)?:\/\/[^:\s/]+:[^@\s<>]{6,}@(?!127\.0\.0\.1|localhost)/ },
  {
    name: "Hardcoded secret assignment",
    re: /\b(SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|SMTP_PASS|CRON_SECRET|API_KEY|SECRET_KEY|PASSWORD)\s*[=:]\s*["']?(?![<$]|your-|change-me|example|placeholder|process\.env|env\()[^\s"'`]{12,}/i,
  },
];

const SKIP = [/^package-lock\.json$/, /^scripts\/check-secrets\.mjs$/, /\.(png|jpe?g|gif|webp|ico|woff2?|pdf)$/i];

function git(args) {
  return execFileSync("git", args, { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
}

const files = (scanAll ? git(["ls-files"]) : git(["diff", "--cached", "--name-only", "--diff-filter=ACMR"]))
  .split("\n")
  .filter(Boolean);

const problems = [];

for (const file of files) {
  for (const rule of FORBIDDEN_FILES) {
    if (rule.test(file)) problems.push(`${file}: ${rule.why} must never be committed`);
  }
  if (SKIP.some((re) => re.test(file))) continue;

  let content;
  try {
    content = scanAll ? git(["show", `HEAD:${file}`]) : git(["show", `:${file}`]);
  } catch {
    continue;
  }
  content.split("\n").forEach((line, i) => {
    if (line.includes("secret-scan:allow")) return;
    for (const p of PATTERNS) {
      if (p.re.test(line)) problems.push(`${file}:${i + 1}: looks like a ${p.name}`);
    }
  });
}

// Run gitleaks too when it is available.
const hasGitleaks = spawnSync("gitleaks", ["version"], { stdio: "ignore" }).status === 0;
if (hasGitleaks) {
  const args = scanAll
    ? ["git", "--redact", "--no-banner", "."]
    : ["git", "--pre-commit", "--staged", "--redact", "--no-banner", "."];
  const res = spawnSync("gitleaks", args, { stdio: "inherit" });
  if (res.status !== 0) problems.push("gitleaks reported a finding (see output above)");
}

if (problems.length > 0) {
  console.error("\n✖ Secret scan failed — commit blocked.\n");
  for (const p of problems) console.error("  - " + p);
  console.error(
    "\nSecrets belong in .env.local (local), Vercel env settings, or the Supabase dashboard — never in git.\n" +
      "If this is a false positive, add `secret-scan:allow` to that line.\n",
  );
  process.exit(1);
}

console.log(
  `✔ Secret scan passed (${files.length} file${files.length === 1 ? "" : "s"}${hasGitleaks ? ", gitleaks ok" : ""}).`,
);
