import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Number of members going, per event id (computed by a database function members may call). */
export async function goingCounts(eventIds: string[]): Promise<Map<string, number>> {
  if (eventIds.length === 0) return new Map();
  const supabase = await createClient();
  const { data } = await supabase.rpc("event_going_counts", { p_event_ids: eventIds });
  return new Map((data ?? []).map((r) => [r.event_id, r.going]));
}
