import { NextResponse, type NextRequest } from "next/server";
import { serverEnv } from "@/lib/env";
import { sendEventReminders } from "@/lib/email/notify";
import { createAdminClient } from "@/lib/supabase/admin";

// Runs once a day (see vercel.json). Vercel sends `Authorization: Bearer <CRON_SECRET>`.
// It sends event reminders and clears old login rate-limit counters. Its database activity also
// keeps a free Supabase project from pausing.
export async function GET(request: NextRequest) {
  const secret = serverEnv.cronSecret;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const reminders = await sendEventReminders();
  await createAdminClient().rpc("rate_limit_cleanup");
  return NextResponse.json({ ok: true, reminders });
}
