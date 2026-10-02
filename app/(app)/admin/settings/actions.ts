"use server";

import { revalidatePath } from "next/cache";
import { getTranslations } from "next-intl/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { BRANDING_BUCKET } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";
import { HEX_COLOR } from "@/lib/theme";
import type { ActionResult } from "@/lib/types";

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
const MAX_BYTES = 2 * 1024 * 1024;

/** Uploads an image to the branding bucket. Returns the new path, null if no file was chosen, or an error key. */
async function uploadImage(
  file: FormDataEntryValue | null,
  folder: string,
): Promise<string | null | { error: string }> {
  if (!(file instanceof File) || file.size === 0) return null;
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { error: "imageType" };
  if (file.size > MAX_BYTES) return { error: "imageSize" };
  const path = `${folder}/${Date.now()}.${ext}`;
  const supabase = await createClient();
  const { error } = await supabase.storage
    .from(BRANDING_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) return { error: "uploadFailed" };
  return path;
}

async function removeFile(path: string | null) {
  if (!path) return;
  const supabase = await createClient();
  await supabase.storage.from(BRANDING_BUCKET).remove([path]);
}

function refreshAll() {
  revalidatePath("/", "layout");
}

export async function saveBranding(_: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("AdminSettings");
  const supabase = await createClient();
  const { data: current } = await supabase.from("community_settings").select("*").eq("id", 1).single();

  const primary = String(formData.get("primary_color") ?? "");
  const accent = String(formData.get("accent_color") ?? "");
  if (!HEX_COLOR.test(primary) || !HEX_COLOR.test(accent)) return { ok: false, message: t("errors.color") };
  const welcome = z
    .string()
    .max(5000)
    .safeParse(formData.get("welcome_text") ?? "");
  if (!welcome.success) return { ok: false, message: t("errors.welcome") };

  let logoPath = current?.logo_path ?? null;
  if (formData.get("remove_logo") === "on") {
    await removeFile(logoPath);
    logoPath = null;
  }
  const uploaded = await uploadImage(formData.get("logo"), "logo");
  if (uploaded && typeof uploaded === "object")
    return { ok: false, message: t(`errors.${uploaded.error}` as "errors.imageType") };
  if (typeof uploaded === "string") {
    await removeFile(logoPath);
    logoPath = uploaded;
  }

  const { error } = await supabase
    .from("community_settings")
    .update({
      logo_path: logoPath,
      primary_color: primary.toLowerCase() === config.theme.primary.toLowerCase() ? null : primary.toLowerCase(),
      accent_color: accent.toLowerCase() === config.theme.accent.toLowerCase() ? null : accent.toLowerCase(),
      welcome_text: welcome.data.trim() || null,
    })
    .eq("id", 1);
  if (error) return { ok: false, message: t("errors.save") };
  refreshAll();
  return { ok: true, message: t("saved") };
}

const text = (max: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() ? v.trim() : null), z.string().max(max).nullable());

export async function savePaymentDetails(_: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();
  const t = await getTranslations("AdminSettings");
  const parsed = z
    .object({
      account_holder: text(200),
      bank_name: text(200),
      account_number: text(100),
      iban: text(50),
      bic: text(20),
      swish_number: text(30),
      instructions: text(5000),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, message: t("errors.save") };

  const supabase = await createClient();
  const { data: current } = await supabase.from("payment_details").select("qr_path").eq("id", 1).single();
  let qrPath = current?.qr_path ?? null;
  if (formData.get("remove_qr") === "on") {
    await removeFile(qrPath);
    qrPath = null;
  }
  const uploaded = await uploadImage(formData.get("qr"), "payment");
  if (uploaded && typeof uploaded === "object")
    return { ok: false, message: t(`errors.${uploaded.error}` as "errors.imageType") };
  if (typeof uploaded === "string") {
    await removeFile(qrPath);
    qrPath = uploaded;
  }

  const { error } = await supabase
    .from("payment_details")
    .update({ ...parsed.data, qr_path: qrPath })
    .eq("id", 1);
  if (error) return { ok: false, message: t("errors.save") };
  refreshAll();
  return { ok: true, message: t("saved") };
}

export async function publishPrivacyPolicy(_: ActionResult, formData: FormData): Promise<ActionResult> {
  const me = await requireAdmin();
  const t = await getTranslations("AdminSettings");
  const bodies = config.locales.map((locale) => ({
    locale,
    body: String(formData.get(`body_${locale}`) ?? "").trim(),
  }));
  if (bodies.some((b) => b.body.length === 0 || b.body.length > 100000))
    return { ok: false, message: t("privacy.empty") };

  const supabase = await createClient();
  const { data: latest } = await supabase
    .from("privacy_policies")
    .select("version")
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  const version = (latest?.version ?? 0) + 1;
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("privacy_policies")
    .insert(bodies.map((b) => ({ version, locale: b.locale, body: b.body, published_at: now, published_by: me.id })));
  if (error) return { ok: false, message: t("errors.save") };

  // The admin who publishes has, of course, read it.
  await supabase
    .from("profiles")
    .update({ privacy_accepted_version: version, privacy_accepted_at: now })
    .eq("id", me.id);
  refreshAll();
  return { ok: true, message: t("privacy.published", { version }) };
}
