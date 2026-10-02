"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { isLocale, LOCALE_COOKIE } from "@/i18n/locale";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/lib/types";

export async function updateProfile(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getTranslations("Profile");
  const name = z.string().trim().min(1).max(80).safeParse(formData.get("display_name"));
  if (!name.success) return { ok: false, message: t("nameInvalid") };
  const locale = String(formData.get("locale") ?? "");

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: name.data,
      locale: isLocale(locale) ? locale : user.profile.locale,
      notify_events: formData.get("notify_events") === "on",
      notify_announcements: formData.get("notify_announcements") === "on",
    })
    .eq("id", user.id);
  if (error) return { ok: false, message: t("saveError") };

  if (isLocale(locale)) {
    (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  }
  revalidatePath("/", "layout");
  return { ok: true, message: t("saved") };
}

export async function deleteAccount(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const user = await requireUser();
  const t = await getTranslations("Profile");
  if (
    String(formData.get("confirm") ?? "")
      .trim()
      .toLowerCase() !== user.email.toLowerCase()
  ) {
    return { ok: false, message: t("deleteConfirmMismatch") };
  }
  const admin = createAdminClient();
  if (user.profile.role === "admin") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "approved");
    // The database also refuses this; checking first gives a clear message.
    if ((count ?? 0) <= 1) return { ok: false, message: t("deleteLastAdmin") };
  }
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) return { ok: false, message: t("deleteError") };
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}
