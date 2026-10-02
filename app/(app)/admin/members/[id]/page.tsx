import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { config, hasMembershipFee } from "@/lib/config";
import { currentPeriod } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime, formatMoney } from "@/lib/time";
import { ActionButton } from "@/components/action-button";
import { paymentTone } from "@/components/payment-info";
import { Alert, Badge, Card, SectionTitle, Table, Td, Th } from "@/components/ui";
import { createCurrentPayment, deleteMember, setMemberRole, setMemberStatus, setPaymentStatus } from "../actions";

export default async function AdminMemberPage({ params }: PageProps<"/admin/members/[id]">) {
  const me = await requireAdmin();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: m } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!m) notFound();

  const [t, tp, locale] = await Promise.all([getTranslations("AdminMembers"), getTranslations("Payment"), getLocale()]);
  const [{ data: payments }, { data: rsvps }] = await Promise.all([
    supabase.from("membership_payments").select("*").eq("member_id", id).order("period_key", { ascending: false }),
    supabase.from("event_attendees").select("*, events(title, starts_at)").eq("member_id", id).eq("status", "going"),
  ]);
  const period = hasMembershipFee ? currentPeriod(config.membership.fee, config.timezone) : null;
  const hasCurrent = period && (payments ?? []).some((p) => p.period_key === period.key);
  const isSelf = m.id === me.id;

  return (
    <div className="space-y-6">
      <Link href={`/admin/members?status=${m.status}`} className="text-sm text-muted hover:underline">
        ← {t("title")}
      </Link>

      <Card className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">{m.display_name}</h1>
            <p className="break-all text-muted">{m.email}</p>
          </div>
          <div className="flex gap-2">
            <Badge tone={m.status === "approved" ? "success" : m.status === "pending" ? "warning" : "danger"}>
              {t(`tabs.${m.status}`)}
            </Badge>
            {m.role === "admin" && <Badge tone="brand">{t("admin")}</Badge>}
          </div>
        </div>
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-muted">{t("memberNumber")}</dt>
            <dd>{m.member_number ?? "–"}</dd>
          </div>
          <div>
            <dt className="text-muted">{t("applied")}</dt>
            <dd>{formatDateTime(m.created_at, locale, config.timezone)}</dd>
          </div>
          {m.approved_at && (
            <div>
              <dt className="text-muted">{t("since")}</dt>
              <dd>{formatDate(m.approved_at, locale, config.timezone)}</dd>
            </div>
          )}
          <div>
            <dt className="text-muted">{t("privacyAccepted")}</dt>
            <dd>{m.privacy_accepted_version ? `v${m.privacy_accepted_version}` : "–"}</dd>
          </div>
        </dl>
        {m.join_message && (
          <div>
            <p className="text-sm text-muted">{t("message")}</p>
            <blockquote className="mt-1 whitespace-pre-wrap border-l-2 border-border pl-3 text-sm">
              {m.join_message}
            </blockquote>
          </div>
        )}

        <div className="flex flex-wrap gap-2 border-t border-border pt-4">
          {m.status !== "approved" && (
            <ActionButton action={setMemberStatus.bind(null, m.id, "approved")} variant="primary">
              {m.status === "pending" ? t("approve") : t("reactivate")}
            </ActionButton>
          )}
          {m.status === "pending" && (
            <ActionButton
              action={setMemberStatus.bind(null, m.id, "rejected")}
              confirm={t("rejectConfirm", { name: m.display_name })}
            >
              {t("reject")}
            </ActionButton>
          )}
          {m.status === "approved" && !isSelf && (
            <ActionButton
              action={setMemberStatus.bind(null, m.id, "suspended")}
              confirm={t("suspendConfirm", { name: m.display_name })}
            >
              {t("suspend")}
            </ActionButton>
          )}
          {m.status === "approved" && m.role === "member" && (
            <ActionButton
              action={setMemberRole.bind(null, m.id, "admin")}
              confirm={t("makeAdminConfirm", { name: m.display_name })}
            >
              {t("makeAdmin")}
            </ActionButton>
          )}
          {m.role === "admin" && (
            <ActionButton
              action={setMemberRole.bind(null, m.id, "member")}
              confirm={t("removeAdminConfirm", { name: m.display_name })}
            >
              {t("removeAdmin")}
            </ActionButton>
          )}
          {!isSelf && (
            <ActionButton
              action={deleteMember.bind(null, m.id)}
              variant="danger"
              confirm={t("deleteConfirm", { name: m.display_name })}
            >
              {t("delete")}
            </ActionButton>
          )}
        </div>
      </Card>

      {hasMembershipFee && m.status === "approved" && (
        <section>
          <SectionTitle>{t("payments")}</SectionTitle>
          {period && !hasCurrent && (
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Alert tone="info">{t("noPaymentYet", { period: period.key })}</Alert>
              <ActionButton action={createCurrentPayment.bind(null, m.id, "confirmed")}>{t("markPaid")}</ActionButton>
              <ActionButton action={createCurrentPayment.bind(null, m.id, "waived")}>{t("waive")}</ActionButton>
            </div>
          )}
          {payments && payments.length > 0 && (
            <Table>
              <thead>
                <tr>
                  <Th>{t("period")}</Th>
                  <Th>{tp("amount")}</Th>
                  <Th>{tp("reference")}</Th>
                  <Th>{t("status")}</Th>
                  <Th />
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id}>
                    <Td>{p.period_key}</Td>
                    <Td>{formatMoney(Number(p.amount), p.currency, locale)}</Td>
                    <Td className="font-mono text-xs">{p.reference}</Td>
                    <Td>
                      <Badge tone={paymentTone(p.status)}>{tp(`status.${p.status}`)}</Badge>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        {p.status !== "confirmed" && (
                          <ActionButton action={setPaymentStatus.bind(null, p.id, "confirmed")}>
                            {t("confirm")}
                          </ActionButton>
                        )}
                        {p.status !== "waived" && p.status !== "confirmed" && (
                          <ActionButton action={setPaymentStatus.bind(null, p.id, "waived")}>{t("waive")}</ActionButton>
                        )}
                        {p.status !== "unpaid" && (
                          <ActionButton action={setPaymentStatus.bind(null, p.id, "unpaid")} variant="ghost">
                            {t("markUnpaid")}
                          </ActionButton>
                        )}
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </section>
      )}

      {rsvps && rsvps.length > 0 && (
        <section>
          <SectionTitle>{t("events")}</SectionTitle>
          <Card className="divide-y divide-border p-0">
            {rsvps.map((r) => (
              <Link
                key={r.id}
                href={`/admin/events/${r.event_id}`}
                className="flex justify-between gap-3 px-5 py-2 text-sm hover:bg-background"
              >
                <span>{r.events?.title}</span>
                <span className="text-muted">
                  {r.events && formatDate(r.events.starts_at, locale, config.timezone)}
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
