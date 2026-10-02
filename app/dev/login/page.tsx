import { createAdminClient } from "@/lib/supabase/admin";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card } from "@/components/ui";
import { devLogin } from "./actions";
import { assertDevLoginAllowed } from "./guard";

// Local development only. Not translated on purpose.
export default async function DevLoginPage() {
  assertDevLoginAllowed();
  const { data: profiles } = await createAdminClient()
    .from("profiles")
    .select("email, display_name, role, status")
    .order("member_number", { nullsFirst: false });

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-12">
      <h1 className="text-2xl font-semibold">Dev login</h1>
      <p className="mt-2 text-sm text-muted">
        One-click login for local development. This page only exists with <code>npm run dev</code> and a local Supabase.
        The real magic-link flow works too: emails land in Mailpit at{" "}
        <a className="underline" href="http://127.0.0.1:54324" target="_blank">
          127.0.0.1:54324
        </a>
        .
      </p>
      <Card className="mt-6 divide-y divide-border p-0">
        {(profiles ?? []).map((p) => (
          <form
            key={p.email}
            action={devLogin.bind(null, p.email)}
            className="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="truncate font-medium">{p.display_name}</p>
              <p className="truncate text-xs text-muted">{p.email}</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={p.role === "admin" ? "brand" : p.status === "approved" ? "success" : "warning"}>
                {p.role === "admin" ? "admin" : p.status}
              </Badge>
              <SubmitButton size="sm" variant="secondary">
                Log in
              </SubmitButton>
            </div>
          </form>
        ))}
      </Card>
    </main>
  );
}
