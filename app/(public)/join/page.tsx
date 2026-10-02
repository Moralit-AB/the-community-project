import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { config, hasMembershipFee } from "@/lib/config";
import { formatMoney } from "@/lib/time";
import { JoinForm } from "@/components/auth-forms";
import { Card } from "@/components/ui";
import { requestJoin, verifyCode } from "../login/actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Auth"))("joinTitle", { community: config.name }) };
}

export default async function JoinPage() {
  if (await getCurrentUser()) redirect("/home");
  const [t, locale] = await Promise.all([getTranslations("Auth"), getLocale()]);
  const fee = config.membership.fee;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-semibold">{t("joinTitle", { community: config.name })}</h1>
      <p className="mb-2 text-muted">{config.membership.requireApproval ? t("joinIntroApproval") : t("joinIntro")}</p>
      {hasMembershipFee && (
        <p className="mb-6 text-sm text-muted">
          {t("joinFee", { amount: formatMoney(fee.amount, fee.currency, locale), period: t(`periods.${fee.period}`) })}
        </p>
      )}
      <Card>
        <JoinForm
          requestAction={requestJoin}
          verifyAction={verifyCode}
          joinMessage={config.membership.joinMessage}
          joinMessagePrompt={t("joinMessagePrompt")}
        />
      </Card>
    </div>
  );
}
