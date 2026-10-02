import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { eventReference } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import { ActionButton } from "@/components/action-button";
import { paymentTone } from "@/components/payment-info";
import { Alert, Badge, ButtonLink, Card, EmptyState, PageHeader, SectionTitle, Table, Td, Th } from "@/components/ui";
import { deleteEvent, removeAttendee, setAttendeePayment } from "../actions";
import { EventForm } from "../event-form";

export default async function AdminEventPage({ params, searchParams }: PageProps<"/admin/events/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) notFound();

  const [t, tp, locale, sp] = await Promise.all([
    getTranslations("AdminEvents"),
    getTranslations("Payment"),
    getLocale(),
    searchParams,
  ]);
  const { data: attendees } = await supabase
    .from("event_attendees")
    .select("*, profiles!event_attendees_member_id_fkey(display_name, email, member_number)")
    .eq("event_id", id)
    .eq("status", "going")
    .order("created_at");
  const hasFee = Number(event.fee_amount ?? 0) > 0;

  return (
    <div className="space-y-8">
      <Link href="/admin/events" className="text-sm text-muted hover:underline">
        ← {t("title")}
      </Link>
      <PageHeader
        title={event.title}
        actions={
          <>
            {event.published && (
              <ButtonLink href={`/events/${event.id}`} variant="secondary">
                {t("viewAsMember")}
              </ButtonLink>
            )}
            <ActionButton action={deleteEvent.bind(null, event.id)} variant="danger" confirm={t("deleteConfirm")}>
              {t("delete")}
            </ActionButton>
          </>
        }
      />
      {sp.created && <Alert tone="success">{event.published ? t("savedPublished") : t("createdDraft")}</Alert>}

      <section>
        <div className="flex items-center justify-between">
          <SectionTitle>
            {t("attendees", { count: attendees?.length ?? 0 })}
            {event.capacity ? ` / ${event.capacity}` : ""}
          </SectionTitle>
          {attendees && attendees.length > 0 && (
            <ButtonLink href={`/admin/events/${event.id}/export`} variant="secondary" size="sm" prefetch={false}>
              {t("exportCsv")}
            </ButtonLink>
          )}
        </div>
        {!attendees || attendees.length === 0 ? (
          <EmptyState>{t("noAttendees")}</EmptyState>
        ) : (
          <Table>
            <thead>
              <tr>
                <Th>{t("name")}</Th>
                <Th>{t("signedUp")}</Th>
                {hasFee && <Th>{t("payment")}</Th>}
                <Th />
              </tr>
            </thead>
            <tbody>
              {attendees.map((a) => (
                <tr key={a.id}>
                  <Td>
                    <Link href={`/admin/members/${a.member_id}`} className="font-medium hover:underline">
                      {a.profiles?.display_name}
                    </Link>
                    <p className="break-all text-xs text-muted">{a.profiles?.email}</p>
                  </Td>
                  <Td className="text-muted">{formatDateTime(a.created_at, locale, config.timezone)}</Td>
                  {hasFee && (
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={paymentTone(a.payment_status)}>
                          {tp(`status.${a.payment_status ?? "unpaid"}`)}
                        </Badge>
                        <span className="font-mono text-xs text-muted">
                          {eventReference(
                            config.membership.referencePrefix,
                            a.profiles?.member_number ?? 0,
                            event.event_number,
                          )}
                        </span>
                        {a.payment_status !== "confirmed" && (
                          <ActionButton action={setAttendeePayment.bind(null, a.id, "confirmed")}>
                            {t("confirmPayment")}
                          </ActionButton>
                        )}
                      </div>
                    </Td>
                  )}
                  <Td className="text-right">
                    <ActionButton
                      action={removeAttendee.bind(null, a.id)}
                      variant="ghost"
                      confirm={t("removeConfirm", { name: a.profiles?.display_name ?? "" })}
                    >
                      {t("remove")}
                    </ActionButton>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </section>

      <section>
        <SectionTitle>{t("edit")}</SectionTitle>
        <Card>
          <EventForm event={event} />
        </Card>
      </section>
    </div>
  );
}
