import { getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { utcToZonedLocalInput } from "@/lib/time";
import type { EventRow } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { saveEvent } from "./actions";

export async function EventForm({ event }: { event?: EventRow }) {
  const t = await getTranslations("AdminEvents");
  const tz = config.timezone;
  const local = (d: string | null | undefined) => (d ? utcToZonedLocalInput(d, tz) : undefined);

  return (
    <ActionForm action={saveEvent.bind(null, event?.id ?? null)} className="space-y-5">
      <Field label={t("fields.title")} htmlFor="title">
        <Input id="title" name="title" defaultValue={event?.title} maxLength={200} required />
      </Field>
      <Field label={t("fields.description")} hint={t("markdownHint")} htmlFor="description">
        <Textarea id="description" name="description" defaultValue={event?.description} rows={8} maxLength={20000} />
      </Field>
      <Field label={t("fields.location")} htmlFor="location">
        <Input id="location" name="location" defaultValue={event?.location ?? ""} maxLength={300} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("fields.starts_at")} hint={t("timezoneHint", { timezone: tz })} htmlFor="starts_at">
          <Input
            id="starts_at"
            name="starts_at"
            type="datetime-local"
            defaultValue={local(event?.starts_at)}
            required
          />
        </Field>
        <Field label={t("fields.ends_at")} htmlFor="ends_at">
          <Input id="ends_at" name="ends_at" type="datetime-local" defaultValue={local(event?.ends_at)} />
        </Field>
        <Field label={t("fields.capacity")} hint={t("capacityHint")} htmlFor="capacity">
          <Input id="capacity" name="capacity" type="number" min={1} defaultValue={event?.capacity ?? ""} />
        </Field>
        <Field label={t("fields.rsvp_deadline")} htmlFor="rsvp_deadline">
          <Input
            id="rsvp_deadline"
            name="rsvp_deadline"
            type="datetime-local"
            defaultValue={local(event?.rsvp_deadline)}
          />
        </Field>
        <Field
          label={`${t("fields.fee_amount")} (${config.membership.fee.currency})`}
          hint={t("feeHint")}
          htmlFor="fee_amount"
        >
          <Input
            id="fee_amount"
            name="fee_amount"
            type="number"
            min={0}
            step="0.01"
            defaultValue={event?.fee_amount ?? ""}
          />
        </Field>
      </div>
      <Checkbox name="published" defaultChecked={event?.published ?? false} label={t("publishLabel")} />
      <SubmitButton>{event ? t("save") : t("create")}</SubmitButton>
    </ActionForm>
  );
}
