"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function rsvp(eventId: string, going: boolean, _: ActionResult): Promise<ActionResult> {
  await requireMember();
  const t = await getTranslations("Events");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("rsvp_event", { p_event_id: eventId, p_going: going });
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/events");
  if (error) return { ok: false, message: t("rsvpError") };
  if (data === "full") return { ok: false, message: t("full") };
  if (data === "closed") return { ok: false, message: t("closed") };
  return { ok: true, message: data === "going" ? t("rsvpGoing") : t("rsvpCancelled") };
}

export async function reportEventPayment(eventId: string) {
  await requireMember();
  const supabase = await createClient();
  await supabase.rpc("report_event_payment", { p_event_id: eventId });
  revalidatePath(`/events/${eventId}`);
}
