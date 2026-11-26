"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { notifyNewEvent } from "@/lib/email/notify";
import { createClient } from "@/lib/supabase/server";
import { zonedLocalToUtc } from "@/lib/time";
import type { ActionResult, PaymentStatus } from "@/lib/types";
import { arg, idSchema, paymentStatusSchema } from "@/lib/validation";

const localDateTime = z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/);
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (v === "" || v === null ? undefined : v), schema.optional());

const eventSchema = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().max(20000).default(""),
  location: optional(z.string().trim().max(300)),
  starts_at: localDateTime,
  ends_at: optional(localDateTime),
  rsvp_deadline: optional(localDateTime),
  capacity: optional(z.coerce.number().int().min(1).max(100000)),
  fee_amount: optional(z.coerce.number().min(0).max(1000000)),
  published: z.boolean(),
});

const FIELD_KEYS = {
  title: "fields.title",
  location: "fields.location",
  starts_at: "fields.starts_at",
  ends_at: "fields.ends_at",
  rsvp_deadline: "fields.rsvp_deadline",
  capacity: "fields.capacity",
  fee_amount: "fields.fee_amount",
  description: "fields.description",
} as const;

function refresh(id?: string) {
  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/home");
  if (id) {
    revalidatePath(`/admin/events/${id}`);
    revalidatePath(`/events/${id}`);
  }
}

export async function saveEvent(eventId: string | null, _: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  if (eventId !== null) eventId = arg(idSchema, eventId);
  const t = await getTranslations("AdminEvents");
  const parsed = eventSchema.safeParse({
    ...Object.fromEntries(formData),
    published: formData.get("published") === "on",
  });
  if (!parsed.success) {
    const field = String(parsed.error.issues[0]?.path[0] ?? "") as keyof typeof FIELD_KEYS;
    const label = field in FIELD_KEYS ? t(FIELD_KEYS[field]) : field;
    return { ok: false, message: t("invalidField", { field: label }) };
  }
  const v = parsed.data;
  const tz = config.timezone;
  const startsAt = zonedLocalToUtc(v.starts_at, tz);
  const endsAt = v.ends_at ? zonedLocalToUtc(v.ends_at, tz) : null;
  if (endsAt && endsAt < startsAt) return { ok: false, message: t("endBeforeStart") };

  const row = {
    title: v.title,
    description: v.description,
    location: v.location ?? null,
    starts_at: startsAt.toISOString(),
    ends_at: endsAt?.toISOString() ?? null,
    rsvp_deadline: v.rsvp_deadline ? zonedLocalToUtc(v.rsvp_deadline, tz).toISOString() : null,
    capacity: v.capacity ?? null,
    fee_amount: v.fee_amount && v.fee_amount > 0 ? v.fee_amount : null,
    fee_currency: v.fee_amount && v.fee_amount > 0 ? config.membership.fee.currency : null,
    published: v.published,
  };

  const supabase = await createClient();
  let id = eventId;
  let wasPublished = false;
  if (eventId) {
    const { data: before } = await supabase.from("events").select("published").eq("id", eventId).single();
    wasPublished = Boolean(before?.published);
    const { error } = await supabase.from("events").update(row).eq("id", eventId);
    if (error) return { ok: false, message: t("saveError") };
  } else {
    const { data, error } = await supabase
      .from("events")
      .insert({ ...row, created_by: me.id })
      .select("id")
      .single();
    if (error) return { ok: false, message: t("saveError") };
    id = data.id;
  }

  if (row.published && !wasPublished && id) {
    const eventIdToNotify = id;
    after(() => notifyNewEvent(eventIdToNotify));
  }
  refresh(id ?? undefined);
  if (!eventId) redirect(`/admin/events/${id}?created=1`);
  return { ok: true, message: row.published && !wasPublished ? t("savedPublished") : t("saved") };
}

export async function deleteEvent(eventId: string, _: ActionResult): Promise<ActionResult> {
  await requireAdmin();
  eventId = arg(idSchema, eventId);
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", eventId);
  if (error) return { ok: false, message: (await getTranslations("AdminEvents"))("saveError") };
  refresh();
  redirect("/admin/events");
}

export async function setAttendeePayment(
  attendeeId: string,
  status: PaymentStatus,
  _: ActionResult,
): Promise<ActionResult> {
  const me = await requireAdmin();
  attendeeId = arg(idSchema, attendeeId);
  status = arg(paymentStatusSchema, status);
  const supabase = await createClient();
  const settled = status === "confirmed" || status === "waived";
  const { data, error } = await supabase
    .from("event_attendees")
    .update({
      payment_status: status,
      payment_confirmed_at: settled ? new Date().toISOString() : null,
      payment_confirmed_by: settled ? me.id : null,
    })
    .eq("id", attendeeId)
    .select("event_id")
    .single();
  if (error) return { ok: false, message: (await getTranslations("AdminEvents"))("saveError") };
  refresh(data.event_id);
  return { ok: true };
}

export async function removeAttendee(attendeeId: string, _: ActionResult): Promise<ActionResult> {
  await requireAdmin();
  attendeeId = arg(idSchema, attendeeId);
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("event_attendees")
    .update({ status: "cancelled" })
    .eq("id", attendeeId)
    .select("event_id")
    .single();
  if (error) return { ok: false, message: (await getTranslations("AdminEvents"))("saveError") };
  refresh(data.event_id);
  return { ok: true };
}
