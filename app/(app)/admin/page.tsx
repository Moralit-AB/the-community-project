import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { config, hasMembershipFee } from "@/lib/config";
import { currentPeriod } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { Card, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("AdminOverview"))("title") };
}

function Stat({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition hover:border-primary">
        <p className="text-3xl font-semibold">{value}</p>
        <p className="mt-1 text-sm text-muted">{label}</p>
      </Card>
    </Link>
  );
}

export default async function AdminOverviewPage() {
  const t = await getTranslations("AdminOverview");
  const supabase = await createClient();
  const period = hasMembershipFee ? currentPeriod(config.membership.fee, config.timezone) : null;

  const [pending, members, upcoming, settled, reported] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved"),
    supabase.from("events").select("id", { count: "exact", head: true }).gte("starts_at", new Date().toISOString()),
    period
      ? supabase
          .from("membership_payments")
          .select("id", { count: "exact", head: true })
          .eq("period_key", period.key)
          .in("status", ["confirmed", "waived"])
      : Promise.resolve({ count: 0 }),
    period
      ? supabase
          .from("membership_payments")
          .select("id", { count: "exact", head: true })
          .eq("period_key", period.key)
          .eq("status", "reported")
      : Promise.resolve({ count: 0 }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} description={t("intro")} />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label={t("pending")} value={pending.count ?? 0} href="/admin/members?status=pending" />
        <Stat label={t("members")} value={members.count ?? 0} href="/admin/members" />
        <Stat label={t("upcomingEvents")} value={upcoming.count ?? 0} href="/admin/events" />
        {period && (
          <Stat
            label={t("unpaid", { period: period.key, reported: reported.count ?? 0 })}
            value={Math.max(0, (members.count ?? 0) - (settled.count ?? 0))}
            href="/admin/members"
          />
        )}
      </div>
      <Card className="text-sm text-muted">
        {t.rich("setupHint", {
          link: (c) => (
            <Link href="/admin/setup" className="font-medium text-primary underline">
              {c}
            </Link>
          ),
        })}
      </Card>
    </div>
  );
}
