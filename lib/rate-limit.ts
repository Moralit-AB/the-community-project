import "server-only";
import { createHmac } from "node:crypto";
import { headers } from "next/headers";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

// Login rate limits, counted in the database (public.rate_limit_hit).
// Supabase Auth has its own per-IP limits, but every login goes through this server, so Supabase
// sees one IP for everybody. These limits are per visitor and per email address instead.

const WINDOW = 15 * 60; // seconds

export const LIMITS = {
  /** Requests for a login link or code. */
  request: { perIp: 10, perEmail: 5 },
  /** Attempts to enter a code. Keeps guessing a 6-digit code hopeless. */
  verify: { perIp: 20, perEmail: 5 },
} as const;

/** The visitor's IP address. On Vercel, x-real-ip and x-forwarded-for are set by the platform. */
async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

/** IPs and emails are stored only as keyed hashes, never in plain text. */
function hashKey(value: string): string {
  return createHmac("sha256", serverEnv.supabaseSecretKey ?? "rate-limit").update(value).digest("hex");
}

async function hit(key: string, limit: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", {
    p_key: hashKey(key),
    p_limit: limit,
    p_window_seconds: WINDOW,
  });
  if (error) {
    // Don't lock everyone out if the database hiccups; Supabase's own limits still apply.
    console.warn(`[rate-limit] check failed: ${error.message}`);
    return true;
  }
  return data;
}

/** Counts one attempt. Returns false when the visitor or the email address has made too many. */
export async function allowAttempt(kind: keyof typeof LIMITS, email: string): Promise<boolean> {
  const limits = LIMITS[kind];
  const ip = await clientIp();
  const [byIp, byEmail] = await Promise.all([
    hit(`${kind}:ip:${ip}`, limits.perIp),
    hit(`${kind}:email:${email}`, limits.perEmail),
  ]);
  return byIp && byEmail;
}
