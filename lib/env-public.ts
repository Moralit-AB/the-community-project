// Public env vars (inlined into the browser bundle by Next.js).
// They must be referenced as literal `process.env.NEXT_PUBLIC_…` for inlining to work.

export const publicEnv = {
  siteUrl: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
};

export function assertPublicEnv() {
  const missing = [
    !process.env.NEXT_PUBLIC_SUPABASE_URL && "NEXT_PUBLIC_SUPABASE_URL",
    !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  ].filter(Boolean);
  if (missing.length > 0) {
    throw new Error(
      `Missing environment variables: ${missing.join(", ")}. ` +
        "Locally run `npm run setup:local`; in production add them in Vercel → Settings → Environment Variables.",
    );
  }
}

/** True when pointing at a local Supabase started by the Supabase CLI. */
export function isLocalSupabase(): boolean {
  try {
    const host = new URL(publicEnv.supabaseUrl).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}
