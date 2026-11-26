"use server";

import { revalidatePath } from "next/cache";
import { requireMember } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { arg, idSchema } from "@/lib/validation";

export async function reportMembershipPayment(paymentId: string) {
  await requireMember();
  paymentId = arg(idSchema, paymentId);
  const supabase = await createClient();
  await supabase.rpc("report_membership_payment", { p_payment_id: paymentId });
  revalidatePath("/membership");
  revalidatePath("/home");
}
