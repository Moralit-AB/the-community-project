"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function acceptPrivacyPolicy(version: number) {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase
    .from("profiles")
    .update({ privacy_accepted_version: version, privacy_accepted_at: new Date().toISOString() })
    .eq("id", user.id);
  revalidatePath("/", "layout");
}
