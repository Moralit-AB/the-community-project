// Shown instead of the app when the Supabase env vars are missing, so a broken
// deployment explains itself instead of crashing.
export function SetupIncomplete() {
  return (
    <main className="mx-auto max-w-xl px-6 py-16">
      <h1 className="text-2xl font-semibold">Almost there: setup is incomplete</h1>
      <p className="mt-4 text-muted">
        The site is running, but it can&apos;t reach its database yet. These environment variables are missing:
      </p>
      <ul className="mt-4 list-disc pl-6 font-mono text-sm">
        {!process.env.NEXT_PUBLIC_SUPABASE_URL && <li>NEXT_PUBLIC_SUPABASE_URL</li>}
        {!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY && <li>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</li>}
      </ul>
      <p className="mt-4 text-muted">
        <strong>On Vercel:</strong> add them under Project → Settings → Environment Variables, then redeploy
        (Deployments → ⋯ → Redeploy). <strong>Locally:</strong> run <code>npm run setup:local</code>. The README walks
        through every step.
      </p>
    </main>
  );
}
