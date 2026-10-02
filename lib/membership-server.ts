import "server-only";
import { config, hasMembershipFee } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";
import { currentPeriod, membershipReference } from "./membership";

/**
 * The member's fee record for the current period, created on first view.
 * Amount, currency and reference come from community.config.ts, never from the browser.
 */
export async function getOrCreateCurrentPayment(profile: Profile) {
  const period = currentPeriod(config.membership.fee, config.timezone);
  if (!hasMembershipFee || !period || !profile.member_number || profile.status !== "approved") {
    return { period, payment: null };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("membership_payments")
    .select("*")
    .eq("member_id", profile.id)
    .eq("period_key", period.key)
    .maybeSingle();
  if (existing) return { period, payment: existing };

  // Members can't insert payment rows themselves (RLS), so the server creates it.
  const { data: created } = await createAdminClient()
    .from("membership_payments")
    .upsert(
      {
        member_id: profile.id,
        period_key: period.key,
        amount: config.membership.fee.amount,
        currency: config.membership.fee.currency,
        reference: membershipReference(config.membership.referencePrefix, profile.member_number, period.key),
      },
      { onConflict: "member_id,period_key", ignoreDuplicates: false },
    )
    .select("*")
    .single();
  return { period, payment: created };
}
