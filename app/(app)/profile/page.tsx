import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config } from "@/lib/config";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, Card, Checkbox, Field, Input, PageHeader, SectionTitle, Select } from "@/components/ui";
import { deleteAccount, updateProfile } from "./actions";

const LANGUAGE_NAMES: Record<string, string> = { en: "English", sv: "Svenska" };

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Profile"))("title") };
}

export default async function ProfilePage() {
  const { profile } = await requireMember();
  const t = await getTranslations("Profile");

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title={t("title")} description={profile.email} />

      <Card>
        <ActionForm action={updateProfile} className="space-y-5">
          <Field label={t("displayName")} hint={t("displayNameHint")} htmlFor="display_name">
            <Input id="display_name" name="display_name" defaultValue={profile.display_name} maxLength={80} required />
          </Field>
          {config.locales.length > 1 && (
            <Field label={t("language")} htmlFor="locale">
              <Select id="locale" name="locale" defaultValue={profile.locale ?? config.defaultLocale}>
                {config.locales.map((l) => (
                  <option key={l} value={l}>
                    {LANGUAGE_NAMES[l] ?? l}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          {config.features.emailNotifications && (
            <fieldset className="space-y-2">
              <legend className="mb-1 text-sm font-medium">{t("emailPreferences")}</legend>
              <Checkbox name="notify_events" defaultChecked={profile.notify_events} label={t("notifyEvents")} />
              {config.features.announcements && (
                <Checkbox
                  name="notify_announcements"
                  defaultChecked={profile.notify_announcements}
                  label={t("notifyAnnouncements")}
                />
              )}
              <p className="text-xs text-muted">{t("essentialEmails")}</p>
            </fieldset>
          )}
          <SubmitButton>{t("save")}</SubmitButton>
        </ActionForm>
      </Card>

      <section>
        <SectionTitle>{t("yourData")}</SectionTitle>
        <Card className="space-y-3">
          <p className="text-sm text-muted">{t("exportBody")}</p>
          <ButtonLink href="/profile/export" variant="secondary" prefetch={false}>
            {t("export")}
          </ButtonLink>
        </Card>
      </section>

      <section>
        <SectionTitle>{t("deleteTitle")}</SectionTitle>
        <Card className="space-y-3 border-red-300 dark:border-red-900">
          <p className="text-sm text-muted">{t("deleteBody")}</p>
          <ActionForm action={deleteAccount} className="space-y-3">
            <Field label={t("deleteConfirmLabel", { email: profile.email })} htmlFor="confirm">
              <Input id="confirm" name="confirm" autoComplete="off" required />
            </Field>
            <SubmitButton variant="danger" confirm={t("deleteConfirmDialog")}>
              {t("deleteButton")}
            </SubmitButton>
          </ActionForm>
        </Card>
      </section>
    </div>
  );
}
