"use server";

import { redirect } from "next/navigation";
import { afterLogin } from "@/lib/post-login";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { assertDevLoginAllowed } from "./guard";

export async function devLogin(email: string) {
  assertDevLoginAllowed();
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (error || !data.properties?.hashed_token) throw new Error(error?.message ?? "Could not create a login link");

  const supabase = await createClient();
  const { data: session, error: verifyError } = await supabase.auth.verifyOtp({
    type: "magiclink",
    token_hash: data.properties.hashed_token,
  });
  if (verifyError || !session.user) throw new Error(verifyError?.message ?? "Login failed");
  redirect(await afterLogin(session.user.id));
}
