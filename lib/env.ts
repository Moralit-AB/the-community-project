import "server-only";

// Secret env vars. Only server code may import this file. The `server-only` import
// makes the build fail if a client component tries to.

function read(name: string): string | undefined {
  const value = process.env[name]?.trim();
  // Treat unfilled placeholders from .env.example as missing.
  if (!value || (value.startsWith("<") && value.endsWith(">"))) return undefined;
  return value;
}

export const serverEnv = {
  get supabaseSecretKey() {
    return read("SUPABASE_SECRET_KEY") ?? read("SUPABASE_SERVICE_ROLE_KEY");
  },
  get adminEmails(): string[] {
    return (read("ADMIN_EMAILS") ?? "")
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
  },
  get smtp() {
    const host = read("SMTP_HOST");
    const from = read("SMTP_FROM");
    if (!host || !from) return null;
    const port = Number(read("SMTP_PORT") ?? 587);
    return { host, port, user: read("SMTP_USER"), pass: read("SMTP_PASS"), from };
  },
  get cronSecret() {
    return read("CRON_SECRET");
  },
};

/** Names of env vars and whether they are set (never their values). Used by /admin/setup. */
export function envStatus(): { name: string; set: boolean; required: boolean }[] {
  const check = (name: string, required = true) => ({ name, set: Boolean(read(name)), required });
  return [
    check("NEXT_PUBLIC_SITE_URL"),
    check("NEXT_PUBLIC_SUPABASE_URL"),
    check("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"),
    { name: "SUPABASE_SECRET_KEY", set: Boolean(serverEnv.supabaseSecretKey), required: true },
    check("ADMIN_EMAILS"),
    check("SMTP_HOST"),
    check("SMTP_PORT", false),
    check("SMTP_USER", false),
    check("SMTP_PASS", false),
    check("SMTP_FROM"),
    check("CRON_SECRET"),
  ];
}
