"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function reportMembershipPayment(paymentId: string) {
  await requireMember();
  const supabase = await createClient();
  await supabase.rpc("report_membership_payment", { p_payment_id: paymentId });
  revalidatePath("/membership");
  revalidatePath("/home");
}
