"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { notifyMemberDecision } from "@/lib/email/notify";
import { currentPeriod, membershipReference } from "@/lib/membership";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult, MemberStatus, PaymentStatus } from "@/lib/types";
import { arg, idSchema, memberRoleSchema, memberStatusSchema, paymentStatusSchema } from "@/lib/validation";

function refresh(memberId?: string) {
  revalidatePath("/admin", "layout");
  if (memberId) revalidatePath(`/admin/members/${memberId}`);
}

async function friendlyError(error: { message: string }) {
  const t = await getTranslations("AdminMembers");
  return /at least one admin/i.test(error.message) ? t("lastAdmin") : t("error");
}

export async function setMemberStatus(memberId: string, status: MemberStatus, _: ActionResult): Promise<ActionResult> {
  await requireAdmin();
  memberId = arg(idSchema, memberId);
  status = arg(memberStatusSchema, status);
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("status").eq("id", memberId).single();
  const { error } = await supabase.from("profiles").update({ status }).eq("id", memberId);
  if (error) return { ok: false, message: await friendlyError(error) };

  if (status === "approved" && before?.status !== "approved") after(() => notifyMemberDecision(memberId, "approved"));
  if (status === "rejected" && before?.status === "pending") after(() => notifyMemberDecision(memberId, "rejected"));
  refresh(memberId);
  const t = await getTranslations("AdminMembers");
  return { ok: true, message: t(`statusChanged.${status}`) };
}

export async function setMemberRole(
  memberId: string,
  role: "member" | "admin",
  _: ActionResult,
): Promise<ActionResult> {
  await requireAdmin();
  memberId = arg(idSchema, memberId);
  role = arg(memberRoleSchema, role);
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ role }).eq("id", memberId);
  if (error) return { ok: false, message: await friendlyError(error) };
  refresh(memberId);
  const t = await getTranslations("AdminMembers");
  return { ok: true, message: t(role === "admin" ? "madeAdmin" : "removedAdmin") };
}

export async function deleteMember(memberId: string, _: ActionResult): Promise<ActionResult> {
  const me = await requireAdmin();
  memberId = arg(idSchema, memberId);
  const t = await getTranslations("AdminMembers");
  if (memberId === me.id) return { ok: false, message: t("deleteSelf") };
  const { error } = await createAdminClient().auth.admin.deleteUser(memberId);
  if (error) return { ok: false, message: await friendlyError(error) };
  refresh();
  redirect("/admin/members");
}

export async function setPaymentStatus(
  paymentId: string,
  status: PaymentStatus,
  _: ActionResult,
): Promise<ActionResult> {
  const me = await requireAdmin();
  paymentId = arg(idSchema, paymentId);
  status = arg(paymentStatusSchema, status);
  const supabase = await createClient();
  const settled = status === "confirmed" || status === "waived";
  const { data, error } = await supabase
    .from("membership_payments")
    .update({
      status,
      confirmed_at: settled ? new Date().toISOString() : null,
      confirmed_by: settled ? me.id : null,
    })
    .eq("id", paymentId)
    .select("member_id")
    .single();
  if (error) return { ok: false, message: await friendlyError(error) };
  refresh(data.member_id);
  return { ok: true };
}

/** Creates the current-period fee row for a member who hasn't opened their membership page yet. */
export async function createCurrentPayment(
  memberId: string,
  status: PaymentStatus,
  _: ActionResult,
): Promise<ActionResult> {
  const me = await requireAdmin();
  memberId = arg(idSchema, memberId);
  status = arg(paymentStatusSchema, status);
  const period = currentPeriod(config.membership.fee, config.timezone);
  const supabase = await createClient();
  const { data: member } = await supabase.from("profiles").select("member_number").eq("id", memberId).single();
  if (!period || !member?.member_number) return { ok: false, message: await friendlyError({ message: "" }) };
  const settled = status === "confirmed" || status === "waived";
  const { error } = await supabase.from("membership_payments").upsert(
    {
      member_id: memberId,
      period_key: period.key,
      amount: config.membership.fee.amount,
      currency: config.membership.fee.currency,
      reference: membershipReference(config.membership.referencePrefix, member.member_number, period.key),
      status,
      confirmed_at: settled ? new Date().toISOString() : null,
      confirmed_by: settled ? me.id : null,
    },
    { onConflict: "member_id,period_key" },
  );
  if (error) return { ok: false, message: await friendlyError(error) };
  refresh(memberId);
  return { ok: true };
}

/** Confirms every payment that members have reported as paid in the current period. */
export async function confirmAllReported(_: ActionResult): Promise<ActionResult> {
  const me = await requireAdmin();
  const period = currentPeriod(config.membership.fee, config.timezone);
  if (!period) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("membership_payments")
    .update({ status: "confirmed", confirmed_at: new Date().toISOString(), confirmed_by: me.id })
    .eq("period_key", period.key)
    .eq("status", "reported")
    .select("id");
  if (error) return { ok: false, message: await friendlyError(error) };
  refresh();
  const t = await getTranslations("AdminMembers");
  return { ok: true, message: t("confirmedCount", { count: data.length }) };
}
