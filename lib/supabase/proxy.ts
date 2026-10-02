import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "@/lib/database.types";
import { publicEnv } from "@/lib/env-public";

/** Refreshes the auth session cookie on every request and returns the user id, if logged in. */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  // Not configured yet: let the app render its "setup incomplete" page.
  if (!publicEnv.supabaseUrl || !publicEnv.supabasePublishableKey) return { response, userId: null };

  const supabase = createServerClient<Database>(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
      },
    },
  });

  // Don't run code between createServerClient and getClaims(): it validates and refreshes the session.
  const { data } = await supabase.auth.getClaims();
  const userId = (data?.claims?.sub as string | undefined) ?? null;

  return { response, userId };
}
