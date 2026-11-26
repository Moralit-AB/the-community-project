import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { sendEventReminders } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/admin";

// Runs once a day (see vercel.json). Vercel sends `Authorization: Bearer <CRON_SECRET>`.
// It records a heartbeat first. That write keeps a free Supabase project from pausing, and
// admins are warned when it gets old (see lib/heartbeat.ts). Then it sends event reminders
// and clears old login rate-limit counters.
// Any failure returns 500, so it shows up under Vercel → Logs instead of passing silently.
export async function GET(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const admin = createAdminClient();

  const heartbeat = await admin.rpc("heartbeat");
  if (heartbeat.error) {
    console.error("cron: heartbeat failed:", heartbeat.error.message);
    return NextResponse.json({ ok: false, step: "heartbeat" }, { status: 500 });
  }

  const reminders = await sendEventReminders();

  const cleanup = await admin.rpc("rate_limit_cleanup");
  if (cleanup.error) {
    console.error("cron: rate limit cleanup failed:", cleanup.error.message);
    return NextResponse.json({ ok: false, step: "cleanup", reminders }, { status: 500 });
  }

  return NextResponse.json({ ok: true, reminders });
}
