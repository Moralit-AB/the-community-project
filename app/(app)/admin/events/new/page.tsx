import { getTranslations } from "next-intl/server";
import { Card, PageHeader } from "@/components/ui";
import { EventForm } from "../event-form";

export default async function NewEventPage() {
  const t = await getTranslations("AdminEvents");
  return (
    <div className="max-w-3xl">
      <PageHeader title={t("new")} />
      <Card>
        <EventForm />
      </Card>
    </div>
  );
}
