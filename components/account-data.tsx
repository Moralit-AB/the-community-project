import { getTranslations } from "next-intl/server";
import { deleteAccount } from "@/app/(app)/profile/actions";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { ButtonLink, Card, Field, Input, SectionTitle } from "@/components/ui";

/** Data export and account deletion. Shown on /profile, and on /pending for people who aren't approved. */
export async function AccountDataSections({ email }: { email: string }) {
  const t = await getTranslations("Profile");
  return (
    <>
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
            <Field label={t("deleteConfirmLabel", { email })} htmlFor="confirm">
              <Input id="confirm" name="confirm" autoComplete="off" required />
            </Field>
            <SubmitButton variant="danger" confirm={t("deleteConfirmDialog")}>
              {t("deleteButton")}
            </SubmitButton>
          </ActionForm>
        </Card>
      </section>
    </>
  );
}
