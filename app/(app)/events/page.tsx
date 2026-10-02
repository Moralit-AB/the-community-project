import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config } from "@/lib/config";
import { goingCounts } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatRange } from "@/lib/time";
import type { EventRow } from "@/lib/types";
import { Badge, Card, EmptyState, PageHeader, SectionTitle } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Events"))("title") };
}

export default async function EventsPage() {
  const user = await requireMember();
  const [t, locale] = await Promise.all([getTranslations("Events"), getLocale()]);
  const supabase = await createClient();
  const now = new Date().toISOString();

  const [{ data: upcoming }, { data: past }, { data: mine }] = await Promise.all([
    supabase.from("events").select("*").eq("published", true).gte("starts_at", now).order("starts_at"),
    supabase
      .from("events")
      .select("*")
      .eq("published", true)
      .lt("starts_at", now)
      .order("starts_at", { ascending: false })
      .limit(20),
    supabase.from("event_attendees").select("event_id").eq("member_id", user.id).eq("status", "going"),
  ]);
  const going = new Set((mine ?? []).map((r) => r.event_id));
  const counts = await goingCounts([...(upcoming ?? []), ...(past ?? [])].map((e) => e.id));

  const EventCard = ({ e }: { e: EventRow }) => {
    const count = counts.get(e.id) ?? 0;
    return (
      <Link href={`/events/${e.id}`} className="block">
        <Card className="transition hover:border-primary">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-lg font-medium">{e.title}</p>
              <p className="text-sm text-muted">{formatRange(e.starts_at, e.ends_at, locale, config.timezone)}</p>
              {e.location && <p className="text-sm text-muted">{e.location}</p>}
            </div>
            <div className="flex flex-wrap gap-1">
              {going.has(e.id) && <Badge tone="success">{t("youreGoing")}</Badge>}
              {e.fee_amount ? (
                <Badge tone="brand">
                  {formatMoney(Number(e.fee_amount), e.fee_currency ?? config.membership.fee.currency, locale)}
                </Badge>
              ) : null}
              {e.capacity ? (
                <Badge tone={count >= e.capacity ? "danger" : "neutral"}>
                  {t("spots", { taken: count, capacity: e.capacity })}
                </Badge>
              ) : (
                <Badge>{t("goingCount", { count })}</Badge>
              )}
            </div>
          </div>
        </Card>
      </Link>
    );
  };

  return (
    <div className="space-y-8">
      <PageHeader title={t("title")} description={t("intro")} />
      <section className="space-y-3">
        <SectionTitle>{t("upcoming")}</SectionTitle>
        {upcoming && upcoming.length > 0 ? (
          upcoming.map((e) => <EventCard key={e.id} e={e} />)
        ) : (
          <EmptyState>{t("noUpcoming")}</EmptyState>
        )}
      </section>
      {past && past.length > 0 && (
        <section className="space-y-3 opacity-80">
          <SectionTitle>{t("past")}</SectionTitle>
          {past.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
        </section>
      )}
    </div>
  );
}
