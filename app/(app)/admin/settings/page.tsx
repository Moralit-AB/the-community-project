import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCommunitySettings, getPaymentDetails } from "@/lib/settings";
import { ActionForm } from "@/components/action-form";
import { ColorField } from "@/components/color-field";
import { SubmitButton } from "@/components/submit-button";
import { Card, Checkbox, Field, Input, PageHeader, SectionTitle, Textarea } from "@/components/ui";
import { saveBranding, savePaymentDetails } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("AdminSettings"))("title") };
}

export default async function AdminSettingsPage() {
  const [t, settings, payment] = await Promise.all([
    getTranslations("AdminSettings"),
    getCommunitySettings(),
    getPaymentDetails(),
  ]);

  return (
    <div className="max-w-3xl space-y-8">
      <PageHeader title={t("title")} description={t("intro")} />

      <section>
        <SectionTitle>{t("branding")}</SectionTitle>
        <Card>
          <ActionForm action={saveBranding} className="space-y-5">
            <Field label={t("logo")} hint={t("imageHint")} htmlFor="logo">
              <div className="flex items-center gap-4">
                {settings.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={settings.logoUrl}
                    alt=""
                    className="h-14 w-auto max-w-[140px] rounded border border-border object-contain"
                  />
                )}
                <Input id="logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" />
              </div>
            </Field>
            {settings.logoUrl && <Checkbox name="remove_logo" label={t("removeLogo")} />}
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorField
                name="primary_color"
                label={t("primaryColor")}
                defaultValue={settings.primary}
                previewLabel={t("preview")}
                lowContrastLabel={t("lowContrast")}
              />
              <ColorField
                name="accent_color"
                label={t("accentColor")}
                checkContrast={false}
                defaultValue={settings.accent}
                previewLabel={t("preview")}
                lowContrastLabel={t("lowContrast")}
              />
            </div>
            <Field label={t("welcomeText")} hint={t("welcomeHint")} htmlFor="welcome_text">
              <Textarea
                id="welcome_text"
                name="welcome_text"
                defaultValue={settings.welcomeText}
                rows={5}
                maxLength={5000}
              />
            </Field>
            <SubmitButton>{t("save")}</SubmitButton>
          </ActionForm>
        </Card>
      </section>

      <section>
        <SectionTitle>{t("paymentDetails")}</SectionTitle>
        <Card>
          <p className="mb-4 text-sm text-muted">{t("paymentIntro")}</p>
          <ActionForm action={savePaymentDetails} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {(["account_holder", "bank_name", "account_number", "iban", "bic", "swish_number"] as const).map((f) => (
                <Field key={f} label={t(`fields.${f}`)} htmlFor={f}>
                  <Input id={f} name={f} defaultValue={payment?.[f] ?? ""} />
                </Field>
              ))}
            </div>
            <Field label={t("qr")} hint={t("imageHint")} htmlFor="qr">
              <div className="flex items-center gap-4">
                {payment?.qrUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={payment.qrUrl}
                    alt=""
                    className="h-20 w-20 rounded border border-border bg-white object-contain"
                  />
                )}
                <Input id="qr" name="qr" type="file" accept="image/png,image/jpeg,image/webp" />
              </div>
            </Field>
            {payment?.qrUrl && <Checkbox name="remove_qr" label={t("removeQr")} />}
            <Field label={t("fields.instructions")} hint={t("instructionsHint")} htmlFor="instructions">
              <Textarea id="instructions" name="instructions" defaultValue={payment?.instructions ?? ""} rows={4} />
            </Field>
            <SubmitButton>{t("save")}</SubmitButton>
          </ActionForm>
        </Card>
      </section>

      <section>
        <SectionTitle>{t("privacyTitle")}</SectionTitle>
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted">{t("privacyIntro")}</p>
          <Link href="/admin/settings/privacy" className="text-sm font-medium text-primary underline">
            {t("editPrivacy")}
          </Link>
        </Card>
      </section>

      <p className="text-sm text-muted">{t("configHint")}</p>
    </div>
  );
}
