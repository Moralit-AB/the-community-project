import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env-public";
import { serverEnv } from "@/lib/env";

/**
 * Supabase client with the SECRET key. It bypasses row-level security.
 * Use it only on the server, after an explicit permission check, for things RLS can't
 * express: admin bootstrap, sending emails, deleting accounts, the setup check.
 */
export function createAdminClient() {
  const key = serverEnv.supabaseSecretKey;
  if (!key) throw new Error("SUPABASE_SECRET_KEY is not set. See .env.example.");
  return createClient<Database>(publicEnv.supabaseUrl, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
