import { getTranslations } from "next-intl/server";
import type { getPaymentDetails } from "@/lib/settings";
import { CopyButton } from "./copy-button";
import { Markdown } from "./markdown";

type Details = NonNullable<Awaited<ReturnType<typeof getPaymentDetails>>>;

function Row({ label, value, copy = true }: { label: string; value: string | null; copy?: boolean }) {
  if (!value) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border py-2 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="flex items-center gap-2 font-medium">
        <span className="break-all">{value}</span>
        {copy && <CopyButton value={value} />}
      </dd>
    </div>
  );
}

/** How to pay: amount and reference first, then the community's payment details. */
export async function PaymentInfo({
  details,
  amount,
  reference,
}: {
  details: Details;
  amount: string;
  reference: string;
}) {
  const t = await getTranslations("Payment");
  return (
    <div className="grid gap-6 md:grid-cols-[1fr_auto]">
      <div>
        <dl>
          <Row label={t("amount")} value={amount} copy={false} />
          <Row label={t("reference")} value={reference} />
          <Row label={t("swish")} value={details.swish_number} />
          <Row label={t("accountHolder")} value={details.account_holder} copy={false} />
          <Row label={t("bank")} value={details.bank_name} copy={false} />
          <Row label={t("accountNumber")} value={details.account_number} />
          <Row label={t("iban")} value={details.iban} />
          <Row label={t("bic")} value={details.bic} />
        </dl>
        {details.instructions && (
          <div className="mt-4 text-sm">
            <Markdown>{details.instructions}</Markdown>
          </div>
        )}
      </div>
      {details.qrUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={details.qrUrl}
          alt={t("qrAlt")}
          className="h-44 w-44 rounded-lg border border-border bg-white object-contain p-2"
        />
      )}
    </div>
  );
}

export function paymentTone(status: string | null | undefined) {
  return status === "confirmed" || status === "waived" ? "success" : status === "reported" ? "info" : "warning";
}
