import { NextResponse } from "next/server";
import { getCurrentUser, isAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { csvResponse, toCsv } from "@/lib/csv";
import { currentPeriod } from "@/lib/membership";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  const user = await getCurrentUser();
  if (!isAdmin(user)) return new NextResponse("Not found", { status: 404 });
  const supabase = await createClient();
  const period = currentPeriod(config.membership.fee, config.timezone);
  const [{ data: members }, { data: payments }] = await Promise.all([
    supabase.from("profiles").select("*").order("member_number", { nullsFirst: false }),
    period
      ? supabase.from("membership_payments").select("*").eq("period_key", period.key)
      : Promise.resolve({ data: [] }),
  ]);
  const byMember = new Map((payments ?? []).map((p) => [p.member_id, p]));

  const header = ["member_number", "name", "email", "status", "role", "applied_at", "approved_at", "language"];
  if (period) header.push(`fee_${period.key}_status`, `fee_${period.key}_reference`);
  const rows = (members ?? []).map((m) => {
    const row: unknown[] = [
      m.member_number,
      m.display_name,
      m.email,
      m.status,
      m.role,
      m.created_at,
      m.approved_at,
      m.locale,
    ];
    if (period) {
      const p = byMember.get(m.id);
      row.push(p?.status ?? (m.status === "approved" ? "unpaid" : ""), p?.reference ?? "");
    }
    return row;
  });
  return csvResponse(`members-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(header, rows));
}
