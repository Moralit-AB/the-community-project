import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { AnnouncementForm } from "../announcement-form";

export default async function NewAnnouncementPage() {
  const t = await getTranslations("AdminAnnouncements");
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("new")} />
      <Card>
        <AnnouncementForm />
      </Card>
    </div>
  );
}
