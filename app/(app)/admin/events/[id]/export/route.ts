import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { csvResponse, toCsv } from "@/lib/csv";
import { eventReference } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

export async function GET(_: NextRequest, ctx: RouteContext<"/admin/events/[id]/export">) {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return new NextResponse("Not found", { status: 404 });
  const { id } = await ctx.params;
  const supabase = await createClient();
  const { data: event } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!event) return new NextResponse("Not found", { status: 404 });
  const { data: rows } = await supabase
    .from("event_attendees")
    .select("*, profiles!event_attendees_member_id_fkey(display_name, email, member_number)")
    .eq("event_id", id)
    .eq("status", "going")
    .order("created_at");

  const csv = toCsv(
    ["name", "email", "member_number", "signed_up_at", "payment_status", "payment_reference"],
    (rows ?? []).map((r) => [
      r.profiles?.display_name,
      r.profiles?.email,
      r.profiles?.member_number,
      r.created_at,
      r.payment_status ?? "",
      r.payment_status
        ? eventReference(config.membership.referencePrefix, r.profiles?.member_number ?? 0, event.event_number)
        : "",
    ]),
  );
  return csvResponse(`event-${event.event_number}-attendees.csv`, csv);
}
