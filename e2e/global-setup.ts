import { execSync, spawnSync } from "node:child_process";

// Runs once before the end-to-end tests. The tests expect fresh demo data (seeded events are dated
// relative to the seed time, and the tests change data), so this rebuilds the LOCAL database from
// the migrations and supabase/seed.sql. `supabase db reset` without --linked/--db-url never touches
// a hosted project. Set E2E_SKIP_DB_RESET=1 to keep the current data.
export default async function globalSetup() {
  if (process.env.E2E_SKIP_DB_RESET === "1") {
    console.log("E2E_SKIP_DB_RESET=1: keeping the current local database.");
    return;
  }

  console.log("Resetting the local database (migrations + demo data)…");
  // Restarting the containers occasionally fails right after Docker starts, so retry once.
  for (let attempt = 1; ; attempt++) {
    const res = spawnSync("npx", ["supabase", "db", "reset"], { stdio: "inherit" });
    if (res.status === 0) break;
    if (attempt === 2) {
      throw new Error("`supabase db reset` failed. Is Docker running and local Supabase started (`npm run setup:local`)?");
    }
    console.log("Reset failed; trying once more…");
  }

  await waitForAuth();
}

/** The reset restarts the containers; wait until the Auth API answers before the tests log in. */
async function waitForAuth(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      // Only API_URL is read; the status output also holds local keys, which are never printed.
      const { API_URL } = JSON.parse(
        execSync("npx supabase status -o json", { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }),
      ) as { API_URL: string };
      if ((await fetch(`${API_URL}/auth/v1/health`)).ok) return;
    } catch {
      // Not up yet.
    }
    await new Promise((r) => setTimeout(r, 1_000));
  }
  throw new Error("Local Supabase didn't become healthy after the database reset.");
}
