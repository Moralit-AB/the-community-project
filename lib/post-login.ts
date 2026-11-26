import "server-only";
import { after } from "next/server";
import { cookies } from "next/headers";
import { config } from "@/lib/config";
import { serverEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { isLocale, LOCALE_COOKIE } from "@/i18n/locale";
import { notifyAdminsOfJoinRequest } from "@/lib/email/notify";

export const NEXT_COOKIE = "post_login_next";

/** Only allow same-site relative paths, so `next` can't redirect to another site. */
export function safeNextPath(value: string | null | undefined): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.startsWith("/\\")) return null;
  return value;
}

/**
 * Runs after a successful magic-link or code login. It:
 *  - makes ADMIN_EMAILS addresses approved admins at their first login (bootstrap)
 *  - auto-approves members when the config says no approval is needed
 *  - emails the admins about a new membership request (once)
 *  - syncs the language between the profile and the cookie
 * and returns where the user should go next.
 */
export async function afterLogin(userId: string): Promise<string> {
  const admin = createAdminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (!profile) return "/login";

  let status = profile.status;

  // ADMIN_EMAILS only decides who becomes an admin at their first login. After that the
  // admin pages decide, so demoting or suspending someone sticks even if they are still listed.
  if (serverEnv.adminEmails.includes(profile.email) && status === "pending") {
    await admin.from("profiles").update({ role: "admin", status: "approved" }).eq("id", userId);
    status = "approved";
  } else if (status === "pending" && !config.membership.requireApproval) {
    await admin.from("profiles").update({ status: "approved" }).eq("id", userId);
    status = "approved";
  }

  if (status === "pending") {
    after(() => notifyAdminsOfJoinRequest(userId));
  }

  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(profile.locale)) {
    cookieStore.set(LOCALE_COOKIE, profile.locale, { path: "/", maxAge: 60 * 60 * 24 * 365, sameSite: "lax" });
  } else if (isLocale(cookieLocale)) {
    await admin.from("profiles").update({ locale: cookieLocale }).eq("id", userId);
  }

  const next = safeNextPath(cookieStore.get(NEXT_COOKIE)?.value);
  cookieStore.delete(NEXT_COOKIE);

  if (status !== "approved") return "/pending";
  return next && next !== "/" && !next.startsWith("/login") ? next : "/home";
}
