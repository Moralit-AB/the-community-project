import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { fillPlaceholders } from "@/lib/privacy";
import { getPrivacyPolicy } from "@/lib/settings";
import { formatDate } from "@/lib/time";
import { Markdown } from "@/components/markdown";
import { Card } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Privacy"))("title") };
}

export default async function PrivacyPage() {
  const [t, locale] = await Promise.all([getTranslations("Privacy"), getLocale()]);
  const policy = await getPrivacyPolicy(locale);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold">{t("title")}</h1>
      {policy && (
        <p className="mt-2 text-sm text-muted">
          {t("updated", {
            date: formatDate(policy.row.published_at, locale, config.timezone),
            version: policy.version,
          })}
        </p>
      )}
      <Card className="mt-6">
        {policy ? <Markdown>{fillPlaceholders(policy.row.body)}</Markdown> : <p>{t("missing")}</p>}
      </Card>
    </div>
  );
}
