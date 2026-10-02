import "server-only";
import { notFound } from "next/navigation";
import { isLocalSupabase } from "@/lib/env-public";

/** The quick-login page exists ONLY in `npm run dev` against a local Supabase. Everywhere else it is a 404. */
export function assertDevLoginAllowed() {
  if (process.env.NODE_ENV !== "development" || !isLocalSupabase()) notFound();
}
