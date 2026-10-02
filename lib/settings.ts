import "server-only";
import { cache } from "react";
import { config } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { safeColor } from "@/lib/theme";

export const BRANDING_BUCKET = "branding";

export function publicFileUrl(supabaseUrl: string, path: string | null): string | null {
  if (!path) return null;
  return `${supabaseUrl}/storage/v1/object/public/${BRANDING_BUCKET}/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** Public community settings (logo, colors, welcome text), with fallbacks from community.config.ts. */
export const getCommunitySettings = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("community_settings").select("*").eq("id", 1).maybeSingle();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return {
    logoUrl: publicFileUrl(supabaseUrl, data?.logo_path ?? null),
    logoPath: data?.logo_path ?? null,
    primary: safeColor(data?.primary_color, config.theme.primary),
    accent: safeColor(data?.accent_color, config.theme.accent),
    customColors: Boolean(data?.primary_color || data?.accent_color),
    welcomeText: data?.welcome_text ?? "",
  };
});

/** Payment details. RLS returns nothing unless the user is an approved member. */
export const getPaymentDetails = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.from("payment_details").select("*").eq("id", 1).maybeSingle();
  if (!data) return null;
  return { ...data, qrUrl: publicFileUrl(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "", data.qr_path) };
});

export function hasAnyPaymentDetails(d: Awaited<ReturnType<typeof getPaymentDetails>>): boolean {
  return Boolean(d && (d.account_number || d.iban || d.swish_number || d.qr_path || d.instructions));
}

/** The latest privacy policy version, and its text in the requested locale (falling back to any locale). */
export const getPrivacyPolicy = cache(async (locale: string) => {
  const supabase = await createClient();
  const { data } = await supabase.from("privacy_policies").select("*").order("version", { ascending: false }).limit(50);
  if (!data || data.length === 0) return null;
  const latest = data[0].version;
  const rows = data.filter((r) => r.version === latest);
  const row = rows.find((r) => r.locale === locale) ?? rows.find((r) => r.locale === config.defaultLocale) ?? rows[0];
  return { version: latest, row, all: rows };
});
