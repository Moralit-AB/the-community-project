"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { z } from "zod";
import { config } from "@/lib/config";
import { publicEnv } from "@/lib/env-public";
import { afterLogin, NEXT_COOKIE, safeNextPath } from "@/lib/post-login";
import { getPrivacyPolicy } from "@/lib/settings";
import { createClient } from "@/lib/supabase/server";

export type AuthStep = { ok: boolean; message?: string; email?: string } | null;

const emailSchema = z
  .email()
  .max(254)
  .transform((e) => e.trim().toLowerCase());

function errorMessage(
  t: Awaited<ReturnType<typeof getTranslations<"Auth">>>,
  error: { code?: string; status?: number },
) {
  if (error.status === 429 || error.code?.includes("rate_limit")) return t("errors.rateLimited");
  return t("errors.generic");
}

export async function requestLogin(_: AuthStep, formData: FormData): Promise<AuthStep> {
  const t = await getTranslations("Auth");
  const email = emailSchema.safeParse(formData.get("email"));
  if (!email.success) return { ok: false, message: t("errors.invalidEmail") };

  const next = safeNextPath(formData.get("next")?.toString());
  if (next) (await cookies()).set(NEXT_COOKIE, next, { path: "/", maxAge: 3600, httpOnly: true, sameSite: "lax" });

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { shouldCreateUser: false, emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm` },
  });
  // Unknown addresses get the same answer as known ones, so nobody can probe who is a member.
  if (error && !(error.code === "otp_disabled" || /signups not allowed/i.test(error.message))) {
    return { ok: false, message: errorMessage(t, error) };
  }
  return { ok: true, email: email.data, message: t("checkEmail") };
}

export async function requestJoin(_: AuthStep, formData: FormData): Promise<AuthStep> {
  const t = await getTranslations("Auth");
  const schema = z.object({
    email: emailSchema,
    name: z.string().trim().min(1).max(80),
    message:
      config.membership.joinMessage === "required"
        ? z.string().trim().min(1).max(2000)
        : z.string().trim().max(2000).optional(),
    privacy: z.literal("on"),
  });
  const parsed = schema.safeParse({
    email: formData.get("email"),
    name: formData.get("name"),
    message: formData.get("message") ?? undefined,
    privacy: formData.get("privacy"),
  });
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    const key =
      field === "email"
        ? "invalidEmail"
        : field === "name"
          ? "nameRequired"
          : field === "message"
            ? "messageRequired"
            : "privacyRequired";
    return { ok: false, message: t(`errors.${key}`) };
  }

  const locale = await getLocale();
  const policy = await getPrivacyPolicy(locale);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm`,
      data: {
        display_name: parsed.data.name,
        join_message: parsed.data.message ?? "",
        locale,
        privacy_version: String(policy?.version ?? 1),
      },
    },
  });
  if (error) return { ok: false, message: errorMessage(t, error) };
  return { ok: true, email: parsed.data.email, message: t("checkEmailJoin") };
}

export async function verifyCode(_: AuthStep, formData: FormData): Promise<AuthStep> {
  const t = await getTranslations("Auth");
  const email = emailSchema.safeParse(formData.get("email"));
  const token = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!email.success || !/^\d{6,10}$/.test(token)) return { ok: false, message: t("errors.invalidCode") };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({ email: email.data, token, type: "email" });
  if (error || !data.user) return { ok: false, email: email.data, message: t("errors.invalidCode") };

  redirect(await afterLogin(data.user.id));
}
