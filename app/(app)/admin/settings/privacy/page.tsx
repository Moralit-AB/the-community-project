import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { publicEnv } from "@/lib/env-public";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/time";
import { ActionForm } from "@/components/action-form";
import { MarkdownEditor } from "@/components/markdown-editor";
import { SubmitButton } from "@/components/submit-button";
import { Alert, Card, Field, PageHeader } from "@/components/ui";
import { publishPrivacyPolicy } from "../actions";

const LANGUAGE_NAMES: Record<string, string> = { en: "English", sv: "Svenska" };

export default async function PrivacyEditorPage() {
  const [t, locale] = await Promise.all([getTranslations("AdminSettings"), getLocale()]);
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("privacy_policies")
    .select("*")
    .order("version", { ascending: false })
    .limit(100);
  const latest = rows?.[0]?.version ?? 0;
  const current = (rows ?? []).filter((r) => r.version === latest);
  const isDefault = current.some((r) => r.is_default);
  const bodyFor = (l: string) =>
    current.find((r) => r.locale === l)?.body ?? current.find((r) => r.locale === config.defaultLocale)?.body ?? "";
  const versions = [...new Map((rows ?? []).map((r) => [r.version, r])).values()];

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/admin/settings" className="text-sm text-muted hover:underline">
        ← {t("title")}
      </Link>
      <PageHeader title={t("privacyTitle")} description={t("privacy.intro")} />
      {isDefault && <Alert tone="warning">{t("privacy.defaultWarning")}</Alert>}
      <Alert tone="info">{t("privacy.notLegalAdvice")}</Alert>

      <Card>
        <ActionForm action={publishPrivacyPolicy} className="space-y-6">
          {config.locales.map((l) => (
            <Field key={l} label={LANGUAGE_NAMES[l] ?? l}>
              <MarkdownEditor
                name={`body_${l}`}
                defaultValue={bodyFor(l)}
                labels={{ write: t("privacy.write"), preview: t("privacy.preview") }}
                placeholders={{ community: config.name, contactEmail: config.contactEmail, siteUrl: publicEnv.siteUrl }}
              />
            </Field>
          ))}
          <p className="text-xs text-muted">{t("privacy.placeholders")}</p>
          <SubmitButton confirm={t("privacy.publishConfirm")}>{t("privacy.publish")}</SubmitButton>
        </ActionForm>
      </Card>

      {versions.length > 0 && (
        <Card>
          <p className="mb-2 text-sm font-medium">{t("privacy.history")}</p>
          <ul className="space-y-1 text-sm text-muted">
            {versions.map((v) => (
              <li key={v.version}>
                v{v.version}: {formatDateTime(v.published_at, locale, config.timezone)}
                {v.is_default ? ` (${t("privacy.default")})` : ""}
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
