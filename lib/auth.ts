import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export type CurrentUser = { id: string; email: string; profile: Profile };

/** The logged-in user and their profile, or null. Cached per request. */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const id = data?.claims?.sub;
  if (!id) return null;
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!profile) return null;
  return { id, email: profile.email, profile };
});

/** Any logged-in user, whatever their membership status. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** An approved member (admins are approved members too). */
export async function requireMember(): Promise<CurrentUser> {
  const user = await requireUser();
  if (user.profile.status !== "approved") redirect("/pending");
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireMember();
  if (user.profile.role !== "admin") redirect("/home");
  return user;
}

export const isAdmin = (user: CurrentUser | null) =>
  user?.profile.role === "admin" && user.profile.status === "approved";
