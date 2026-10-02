import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config, hasMembershipFee } from "@/lib/config";
import { getOrCreateCurrentPayment } from "@/lib/membership-server";
import { createClient } from "@/lib/supabase/server";
import { formatMoney, formatRange } from "@/lib/time";
import { paymentTone } from "@/components/payment-info";
import { Alert, Badge, ButtonLink, Card, EmptyState, SectionTitle } from "@/components/ui";

export default async function HomePage() {
  const user = await requireMember();
  const [t, tp, locale] = await Promise.all([getTranslations("Home"), getTranslations("Payment"), getLocale()]);
  const supabase = await createClient();

  const [{ payment, period }, { data: events }, { data: announcements }, { data: myRsvps }] = await Promise.all([
    getOrCreateCurrentPayment(user.profile),
    supabase
      .from("events")
      .select("*")
      .eq("published", true)
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(3),
    config.features.announcements
      ? supabase
          .from("announcements")
          .select("id, title, published_at, pinned")
          .not("published_at", "is", null)
          .lte("published_at", new Date().toISOString())
          .order("pinned", { ascending: false })
          .order("published_at", { ascending: false })
          .limit(3)
      : Promise.resolve({ data: [] }),
    supabase.from("event_attendees").select("event_id").eq("member_id", user.id).eq("status", "going"),
  ]);
  const going = new Set((myRsvps ?? []).map((r) => r.event_id));
  const overdue = payment?.status === "unpaid" && period && new Date() > period.due;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">{t("greeting", { name: user.profile.display_name })}</h1>

      {hasMembershipFee && payment && (
        <Card className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-muted">{t("membershipPeriod", { period: payment.period_key })}</p>
            <p className="mt-1 flex items-center gap-2 font-medium">
              {formatMoney(Number(payment.amount), payment.currency, locale)}
              <Badge tone={overdue ? "danger" : paymentTone(payment.status)}>
                {overdue ? tp("status.overdue") : tp(`status.${payment.status}`)}
              </Badge>
            </p>
          </div>
          {payment.status === "unpaid" && <ButtonLink href="/membership">{t("payNow")}</ButtonLink>}
        </Card>
      )}

      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>{t("upcomingEvents")}</SectionTitle>
          <Link href="/events" className="text-sm text-primary underline">
            {t("seeAll")}
          </Link>
        </div>
        {events && events.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {events.map((e) => (
              <Link key={e.id} href={`/events/${e.id}`} className="block">
                <Card className="h-full transition hover:border-primary">
                  <p className="font-medium">{e.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    {formatRange(e.starts_at, e.ends_at, locale, config.timezone)}
                  </p>
                  {going.has(e.id) && (
                    <div className="mt-2">
                      <Badge tone="success">{t("youreGoing")}</Badge>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState>{t("noEvents")}</EmptyState>
        )}
      </section>

      {config.features.announcements && (
        <section>
          <div className="flex items-center justify-between">
            <SectionTitle>{t("latestNews")}</SectionTitle>
            <Link href="/announcements" className="text-sm text-primary underline">
              {t("seeAll")}
            </Link>
          </div>
          {announcements && announcements.length > 0 ? (
            <Card className="divide-y divide-border p-0">
              {announcements.map((a) => (
                <Link
                  key={a.id}
                  href={`/announcements/${a.id}`}
                  className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-background"
                >
                  <span className="font-medium">{a.title}</span>
                  {a.pinned && <Badge tone="brand">{t("pinned")}</Badge>}
                </Link>
              ))}
            </Card>
          ) : (
            <EmptyState>{t("noNews")}</EmptyState>
          )}
        </section>
      )}

      {user.profile.role === "admin" && <Alert tone="info">{t("adminHint")}</Alert>}
    </div>
  );
}
