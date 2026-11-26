"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireMember } from "@/lib/auth";
import { config } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { arg, idSchema } from "@/lib/validation";

export async function addComment(announcementId: string, _: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireMember();
  announcementId = arg(idSchema, announcementId);
  const t = await getTranslations("Announcements");
  if (!config.features.comments) return { ok: false, message: t("commentsOff") };
  const body = z.string().trim().min(1).max(5000).safeParse(formData.get("body"));
  if (!body.success) return { ok: false, message: t("commentInvalid") };

  const supabase = await createClient();
  const { error } = await supabase
    .from("announcement_comments")
    .insert({ announcement_id: announcementId, author_id: user.id, body: body.data });
  if (error) return { ok: false, message: t("commentError") };
  revalidatePath(`/announcements/${announcementId}`);
  return { ok: true };
}

export async function deleteComment(announcementId: string, commentId: string) {
  await requireMember();
  announcementId = arg(idSchema, announcementId);
  commentId = arg(idSchema, commentId);
  const supabase = await createClient();
  // RLS allows this only for the comment's author or an admin.
  await supabase.from("announcement_comments").update({ deleted_at: new Date().toISOString() }).eq("id", commentId);
  revalidatePath(`/announcements/${announcementId}`);
}
