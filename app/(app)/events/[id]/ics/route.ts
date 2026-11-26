import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { config } from "@/lib/config";
import { publicEnv } from "@/lib/env-public";
import { createClient } from "@/lib/supabase/server";

function icsDate(d: string) {
  return new Date(d)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function icsText(s: string) {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

// Calendar file (.ics) for one event, for members only.
export async function GET(_: NextRequest, ctx: RouteContext<"/events/[id]/ics">) {
  const { id } = await ctx.params;
  const user = await getCurrentUser();
  if (!user || user.profile.status !== "approved") return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const { data: e } = await supabase.from("events").select("*").eq("id", id).maybeSingle();
  if (!e) return new NextResponse("Not found", { status: 404 });

  const end = e.ends_at ?? new Date(new Date(e.starts_at).getTime() + 2 * 3600 * 1000).toISOString();
  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${icsText(config.name)}//The Community Project//EN`,
    "BEGIN:VEVENT",
    `UID:${e.id}@${new URL(publicEnv.siteUrl).hostname}`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(e.starts_at)}`,
    `DTEND:${icsDate(end)}`,
    `SUMMARY:${icsText(e.title)}`,
    e.location ? `LOCATION:${icsText(e.location)}` : "",
    `DESCRIPTION:${icsText(`${publicEnv.siteUrl}/events/${e.id}`)}`,
    `URL:${publicEnv.siteUrl}/events/${e.id}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="event-${e.event_number}.ics"`,
    },
  });
}
