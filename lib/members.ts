import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Display names for the given profile ids (members only see approved members' names). */
export async function memberNames(ids: (string | null)[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (unique.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.from("member_names").select("id, display_name").in("id", unique);
  return new Map((data ?? []).map((r) => [r.id!, r.display_name!]));
}
