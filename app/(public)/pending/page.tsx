import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { AccountDataSections } from "@/components/account-data";
import { Alert, Card } from "@/components/ui";

export default async function PendingPage() {
  const user = await requireUser();
  if (user.profile.status === "approved") redirect("/home");
  const t = await getTranslations("Pending");
  const status = user.profile.status;

  return (
    <div className="mx-auto max-w-lg space-y-8">
      <Card className="space-y-4">
        <h1 className="text-2xl font-semibold">{t(`${status}.title`, { name: user.profile.display_name })}</h1>
        <p className="text-muted">{t(`${status}.body`, { community: config.name })}</p>
        {status === "pending" && <Alert tone="info">{t("pending.next")}</Alert>}
        <p className="text-sm text-muted">
          {t("contact")}{" "}
          <a className="text-primary underline" href={`mailto:${config.contactEmail}`}>
            {config.contactEmail}
          </a>
        </p>
      </Card>
      <AccountDataSections email={user.email} />
    </div>
  );
}
