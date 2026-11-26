"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { notifyNewAnnouncement } from "@/lib/email/notify";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";
import { arg, idSchema } from "@/lib/validation";

const schema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().max(50000),
});

function refresh(id?: string) {
  revalidatePath("/admin/announcements");
  revalidatePath("/announcements");
  revalidatePath("/home");
  if (id) revalidatePath(`/announcements/${id}`);
}

export async function saveAnnouncement(id: string | null, _: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  if (id !== null) id = arg(idSchema, id);
  const t = await getTranslations("AdminAnnouncements");
  const parsed = schema.safeParse({ title: formData.get("title"), body: formData.get("body") ?? "" });
  if (!parsed.success) return { ok: false, message: t("invalid") };
  const publish = formData.get("published") === "on";

  const supabase = await createClient();
  let wasPublished = false;
  let publishedAt: string | null = null;
  if (id) {
    const { data: before } = await supabase.from("announcements").select("published_at").eq("id", id).single();
    wasPublished = Boolean(before?.published_at);
    publishedAt = before?.published_at ?? null;
  }
  const row = {
    ...parsed.data,
    pinned: formData.get("pinned") === "on",
    allow_comments: formData.get("allow_comments") === "on",
    published_at: publish ? (publishedAt ?? new Date().toISOString()) : null,
  };

  let savedId = id;
  if (id) {
    const { error } = await supabase.from("announcements").update(row).eq("id", id);
    if (error) return { ok: false, message: t("error") };
  } else {
    const { data, error } = await supabase
      .from("announcements")
      .insert({ ...row, author_id: me.id })
      .select("id")
      .single();
    if (error) return { ok: false, message: t("error") };
    savedId = data.id;
  }

  if (publish && !wasPublished && savedId) {
    const toNotify = savedId;
    after(() => notifyNewAnnouncement(toNotify));
  }
  refresh(savedId ?? undefined);
  if (!id) redirect("/admin/announcements");
  return { ok: true, message: t("saved") };
}

export async function deleteAnnouncement(id: string, _: ActionResult): Promise<ActionResult> {
  await requireAdmin();
  id = arg(idSchema, id);
  const supabase = await createClient();
  await supabase.from("announcements").delete().eq("id", id);
  refresh();
  redirect("/admin/announcements");
}
