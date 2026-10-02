import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config, hasMembershipFee } from "@/lib/config";
import { dueDate, isOverdue } from "@/lib/membership";
import { getOrCreateCurrentPayment } from "@/lib/membership-server";
import { getPaymentDetails, hasAnyPaymentDetails } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatMoney } from "@/lib/time";
import { PaymentInfo, paymentTone } from "@/components/payment-info";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Badge, Card, PageHeader, SectionTitle, Table, Td, Th } from "@/components/ui";
import { reportMembershipPayment } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Membership"))("title") };
}

export default async function MembershipPage() {
  const user = await requireMember();
  const [t, tp, locale] = await Promise.all([getTranslations("Membership"), getTranslations("Payment"), getLocale()]);
  const { payment, period } = await getOrCreateCurrentPayment(user.profile);
  const details = await getPaymentDetails();
  const supabase = await createClient();
  const { data: history } = await supabase
    .from("membership_payments")
    .select("*")
    .eq("member_id", user.id)
    .order("period_key", { ascending: false });

  const fee = config.membership.fee;
  const overdue = isOverdue(period, payment?.status, user.profile.approved_at, config.membership.fee.graceDays);

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        description={t("memberSince", {
          number: user.profile.member_number ?? "–",
          date: formatDate(user.profile.approved_at ?? user.profile.created_at, locale, config.timezone),
        })}
      />

      {!hasMembershipFee ? (
        <Alert tone="success" title={t("noFeeTitle")}>
          {t("noFeeBody")}
        </Alert>
      ) : payment && period ? (
        <Card className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <SectionTitle>{t("currentPeriod", { period: payment.period_key })}</SectionTitle>
              <p className="-mt-2 text-sm text-muted">
                {t("feeDescription", {
                  amount: formatMoney(fee.amount, fee.currency, locale),
                  period: tp(`periods.${fee.period}`),
                  due: formatDate(dueDate(period, user.profile.approved_at, fee.graceDays), locale, config.timezone),
                })}
              </p>
            </div>
            <Badge tone={overdue ? "danger" : paymentTone(payment.status)}>
              {overdue ? tp("status.overdue") : tp(`status.${payment.status}`)}
            </Badge>
          </div>

          {payment.status === "confirmed" || payment.status === "waived" ? (
            <Alert tone="success">{t(payment.status === "waived" ? "waived" : "paid")}</Alert>
          ) : (
            <>
              {hasAnyPaymentDetails(details) && details ? (
                <PaymentInfo
                  details={details}
                  amount={formatMoney(Number(payment.amount), payment.currency, locale)}
                  reference={payment.reference}
                />
              ) : (
                <Alert tone="warning">{t("noPaymentDetails", { contact: config.contactEmail })}</Alert>
              )}
              {payment.status === "unpaid" ? (
                <form
                  action={reportMembershipPayment.bind(null, payment.id)}
                  className="flex flex-wrap items-center gap-3"
                >
                  <SubmitButton>{tp("iHavePaid")}</SubmitButton>
                  <p className="text-sm text-muted">{tp("iHavePaidHint")}</p>
                </form>
              ) : (
                <Alert tone="info">{tp("reportedInfo")}</Alert>
              )}
            </>
          )}
        </Card>
      ) : null}

      {history && history.length > 0 && (
        <section>
          <SectionTitle>{t("history")}</SectionTitle>
          <Table>
            <thead>
              <tr>
                <Th>{t("period")}</Th>
                <Th>{tp("amount")}</Th>
                <Th>{tp("reference")}</Th>
                <Th>{t("status")}</Th>
              </tr>
            </thead>
            <tbody>
              {history.map((p) => (
                <tr key={p.id}>
                  <Td>{p.period_key}</Td>
                  <Td>{formatMoney(Number(p.amount), p.currency, locale)}</Td>
                  <Td className="font-mono text-xs">{p.reference}</Td>
                  <Td>
                    <Badge tone={paymentTone(p.status)}>{tp(`status.${p.status}`)}</Badge>
                  </Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </section>
      )}
    </div>
  );
}
