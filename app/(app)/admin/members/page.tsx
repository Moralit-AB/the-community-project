import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { config, hasMembershipFee } from "@/lib/config";
import { currentPeriod } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import type { MemberStatus } from "@/lib/types";
import { ActionButton } from "@/components/action-button";
import { ActionForm } from "@/components/action-form";
import { paymentTone } from "@/components/payment-info";
import { SubmitButton } from "@/components/submit-button";
import { Badge, ButtonLink, EmptyState, Input, PageHeader, Table, Td, Th, cn } from "@/components/ui";
import { confirmAllReported, setMemberStatus, setPaymentStatus } from "./actions";

const STATUSES = ["pending", "approved", "suspended", "rejected"] as const;

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("AdminMembers"))("title") };
}

export default async function AdminMembersPage({ searchParams }: PageProps<"/admin/members">) {
  const params = await searchParams;
  const status: MemberStatus = STATUSES.includes(params.status as MemberStatus)
    ? (params.status as MemberStatus)
    : "approved";
  const q = typeof params.q === "string" ? params.q.trim().slice(0, 100) : "";
  const [t, tp, locale] = await Promise.all([getTranslations("AdminMembers"), getTranslations("Payment"), getLocale()]);
  const supabase = await createClient();
  const period = hasMembershipFee ? currentPeriod(config.membership.fee, config.timezone) : null;

  let query = supabase.from("profiles").select("*").eq("status", status);
  if (q) {
    const term = q.replace(/[%_,()]/g, " ");
    query = query.or(`display_name.ilike.%${term}%,email.ilike.%${term}%`);
  }
  const [{ data: members }, { data: counts }, { data: payments }] = await Promise.all([
    query.order(status === "approved" ? "member_number" : "created_at", { ascending: status === "approved" }),
    supabase.from("profiles").select("status"),
    period
      ? supabase.from("membership_payments").select("*").eq("period_key", period.key)
      : Promise.resolve({ data: [] }),
  ]);
  const countBy = (s: string) => (counts ?? []).filter((c) => c.status === s).length;
  const paymentBy = new Map((payments ?? []).map((p) => [p.member_id, p]));
  const reportedCount = (payments ?? []).filter((p) => p.status === "reported").length;

  return (
    <div className="space-y-5">
      <PageHeader
        title={t("title")}
        actions={
          <ButtonLink href="/admin/members/export" variant="secondary" prefetch={false}>
            {t("exportCsv")}
          </ButtonLink>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1">
          {STATUSES.map((s) => (
            <Link
              key={s}
              href={`/admin/members?status=${s}`}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                s === status
                  ? "border-primary bg-primary text-primary-fg"
                  : "border-border text-muted hover:text-foreground",
              )}
            >
              {t(`tabs.${s}`)} ({countBy(s)})
            </Link>
          ))}
        </div>
        <form className="flex gap-2">
          <input type="hidden" name="status" value={status} />
          <Input name="q" defaultValue={q} placeholder={t("search")} className="w-56" />
        </form>
      </div>

      {status === "approved" && period && reportedCount > 0 && (
        <ActionForm
          action={confirmAllReported}
          className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3"
        >
          <p className="text-sm">{t("reportedBanner", { count: reportedCount, period: period.key })}</p>
          <SubmitButton size="sm" confirm={t("confirmAllPrompt", { count: reportedCount })}>
            {t("confirmAll")}
          </SubmitButton>
        </ActionForm>
      )}

      {!members || members.length === 0 ? (
        <EmptyState>{t(`empty.${status}`)}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              {status === "approved" && <Th>#</Th>}
              <Th>{t("name")}</Th>
              <Th>{t("email")}</Th>
              {status === "pending" && <Th>{t("message")}</Th>}
              {status === "approved" && period && <Th>{t("fee", { period: period.key })}</Th>}
              <Th>{status === "approved" ? t("since") : t("applied")}</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => {
              const payment = paymentBy.get(m.id);
              return (
                <tr key={m.id}>
                  {status === "approved" && <Td className="text-muted">{m.member_number}</Td>}
                  <Td>
                    <Link href={`/admin/members/${m.id}`} className="font-medium hover:underline">
                      {m.display_name}
                    </Link>
                    {m.role === "admin" && (
                      <span className="ml-2">
                        <Badge tone="brand">{t("admin")}</Badge>
                      </span>
                    )}
                  </Td>
                  <Td className="break-all text-muted">{m.email}</Td>
                  {status === "pending" && (
                    <Td className="max-w-xs whitespace-pre-wrap text-xs text-muted">{m.join_message}</Td>
                  )}
                  {status === "approved" && period && (
                    <Td>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={paymentTone(payment?.status)}>{tp(`status.${payment?.status ?? "unpaid"}`)}</Badge>
                        {payment && payment.status !== "confirmed" && payment.status !== "waived" && (
                          <ActionButton action={setPaymentStatus.bind(null, payment.id, "confirmed")}>
                            {t("confirm")}
                          </ActionButton>
                        )}
                      </div>
                    </Td>
                  )}
                  <Td className="whitespace-nowrap text-muted">
                    {formatDate(
                      (status === "approved" ? m.approved_at : null) ?? m.created_at,
                      locale,
                      config.timezone,
                    )}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    {status === "pending" ? (
                      <div className="flex justify-end gap-2">
                        <ActionButton action={setMemberStatus.bind(null, m.id, "approved")} variant="primary">
                          {t("approve")}
                        </ActionButton>
                        <ActionButton
                          action={setMemberStatus.bind(null, m.id, "rejected")}
                          variant="ghost"
                          confirm={t("rejectConfirm", { name: m.display_name })}
                        >
                          {t("reject")}
                        </ActionButton>
                      </div>
                    ) : (
                      <Link href={`/admin/members/${m.id}`} className="text-sm text-primary underline">
                        {t("manage")}
                      </Link>
                    )}
                  </Td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      )}
    </div>
  );
}
