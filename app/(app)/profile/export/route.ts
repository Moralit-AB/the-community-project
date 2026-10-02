import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// GDPR data export: everything stored about the logged-in member, as JSON.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return new NextResponse("Unauthorized", { status: 401 });
  const supabase = await createClient();
  const [payments, attendance, comments] = await Promise.all([
    supabase.from("membership_payments").select("*").eq("member_id", user.id),
    supabase.from("event_attendees").select("*, events(title, starts_at)").eq("member_id", user.id),
    supabase.from("announcement_comments").select("*").eq("author_id", user.id),
  ]);

  const data = {
    exported_at: new Date().toISOString(),
    profile: user.profile,
    membership_payments: payments.data ?? [],
    event_attendance: attendance.data ?? [],
    comments: comments.data ?? [],
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="my-data.json"`,
      "Cache-Control": "no-store",
    },
  });
}
