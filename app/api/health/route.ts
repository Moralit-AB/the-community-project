import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env-public";

// Public health check: GET /api/health runs one tiny read with the publishable key and says
// whether the database answered. Point a free uptime monitor or the optional GitHub
// workflow (.github/workflows/keepalive.yml) at it as a second way to keep a free Supabase
// project active. It needs no secret, writes nothing and reveals nothing but up or down.
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) {
    return NextResponse.json({ ok: false }, { status: 503, headers });
  }
  const supabase = createClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await supabase.from("community_settings").select("id").eq("id", 1).maybeSingle();
  return NextResponse.json({ ok: !error }, { status: error ? 503 : 200, headers });
}
