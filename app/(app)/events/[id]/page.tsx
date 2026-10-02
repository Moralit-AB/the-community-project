import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config } from "@/lib/config";
import { eventReference } from "@/lib/membership";
import { getPaymentDetails, hasAnyPaymentDetails } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime, formatMoney, formatRange } from "@/lib/time";
import { ActionForm } from "@/components/action-form";
import { Markdown } from "@/components/markdown";
import { PaymentInfo, paymentTone } from "@/components/payment-info";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, SectionTitle } from "@/components/ui";
import { reportEventPayment, rsvp } from "./actions";

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/events/[id]">): Promise<Metadata> {
  const event = await load((await params).id);
  return { title: event?.title };
}

export default async function EventPage({ params }: PageProps<"/events/[id]">) {
  const user = await requireMember();
  const event = await load((await params).id);
  if (!event) notFound();

  const [t, tp, locale] = await Promise.all([getTranslations("Events"), getTranslations("Payment"), getLocale()]);
  const supabase = await createClient();
  const [{ data: mine }, { data: names }] = await Promise.all([
    supabase.from("event_attendees").select("*").eq("event_id", event.id).eq("member_id", user.id).maybeSingle(),
    supabase.rpc("event_attendee_names", { p_event_id: event.id }),
  ]);

  const isGoing = mine?.status === "going";
  const started = new Date(event.starts_at) <= new Date();
  const deadlinePassed = event.rsvp_deadline ? new Date(event.rsvp_deadline) < new Date() : false;
  const goingCount = names?.length ?? 0;
  const full = event.capacity ? goingCount >= event.capacity : false;
  const fee = event.fee_amount ? Number(event.fee_amount) : 0;
  const currency = event.fee_currency ?? config.membership.fee.currency;
  const details = fee > 0 && isGoing ? await getPaymentDetails() : null;

  return (
    <div className="space-y-6">
      <Link href="/events" className="text-sm text-muted hover:underline">
        ← {t("back")}
      </Link>
      <div>
        <h1 className="text-3xl font-semibold">{event.title}</h1>
        {!event.published && <Badge tone="warning">{t("draft")}</Badge>}
      </div>

      <div className="grid items-start gap-6 md:grid-cols-[1fr_280px]">
        <Card>
          {event.description ? (
            <Markdown>{event.description}</Markdown>
          ) : (
            <p className="text-muted">{t("noDescription")}</p>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-2 text-sm">
            <p>
              <span className="text-muted">{t("when")}:</span>{" "}
              {formatRange(event.starts_at, event.ends_at, locale, config.timezone)}
            </p>
            {event.location && (
              <p>
                <span className="text-muted">{t("where")}:</span> {event.location}
              </p>
            )}
            {fee > 0 && (
              <p>
                <span className="text-muted">{t("fee")}:</span> {formatMoney(fee, currency, locale)}
              </p>
            )}
            {event.capacity && (
              <p>
                <span className="text-muted">{t("capacity")}:</span>{" "}
                {t("spots", { taken: goingCount, capacity: event.capacity })}
              </p>
            )}
            {event.rsvp_deadline && (
              <p>
                <span className="text-muted">{t("deadline")}:</span>{" "}
                {formatDateTime(event.rsvp_deadline, locale, config.timezone)}
              </p>
            )}
            <a href={`/events/${event.id}/ics`} className="inline-block pt-1 text-primary underline">
              {t("addToCalendar")}
            </a>
          </Card>

          <Card className="space-y-3">
            {isGoing ? (
              <>
                <Badge tone="success">{t("youreGoing")}</Badge>
                {!started && (
                  <ActionForm action={rsvp.bind(null, event.id, false)}>
                    <SubmitButton variant="secondary" className="w-full" confirm={t("cancelConfirm")}>
                      {t("cancelRsvp")}
                    </SubmitButton>
                  </ActionForm>
                )}
              </>
            ) : started ? (
              <p className="text-sm text-muted">{t("started")}</p>
            ) : deadlinePassed ? (
              <p className="text-sm text-muted">{t("closed")}</p>
            ) : full ? (
              <p className="text-sm text-muted">{t("full")}</p>
            ) : (
              <ActionForm action={rsvp.bind(null, event.id, true)}>
                <SubmitButton className="w-full">{t("rsvp")}</SubmitButton>
              </ActionForm>
            )}
          </Card>
        </div>
      </div>

      {isGoing && fee > 0 && mine && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <SectionTitle>{t("payForEvent")}</SectionTitle>
            <Badge tone={paymentTone(mine.payment_status)}>{tp(`status.${mine.payment_status ?? "unpaid"}`)}</Badge>
          </div>
          {mine.payment_status === "confirmed" || mine.payment_status === "waived" ? (
            <Alert tone="success">{t("paid")}</Alert>
          ) : (
            <>
              {details && hasAnyPaymentDetails(details) ? (
                <PaymentInfo
                  details={details}
                  amount={formatMoney(fee, currency, locale)}
                  reference={eventReference(
                    config.membership.referencePrefix,
                    user.profile.member_number ?? 0,
                    event.event_number,
                  )}
                />
              ) : (
                <Alert tone="warning">{t("noPaymentDetails")}</Alert>
              )}
              {mine.payment_status === "unpaid" ? (
                <form action={reportEventPayment.bind(null, event.id)} className="flex flex-wrap items-center gap-3">
                  <SubmitButton>{tp("iHavePaid")}</SubmitButton>
                  <p className="text-sm text-muted">{tp("iHavePaidHint")}</p>
                </form>
              ) : (
                <Alert tone="info">{tp("reportedInfo")}</Alert>
              )}
            </>
          )}
        </Card>
      )}

      {names && names.length > 0 && (
        <section>
          <SectionTitle>{t("whosGoing", { count: names.length })}</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {names.map((n, i) => (
              <Badge key={i}>{n.display_name}</Badge>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
