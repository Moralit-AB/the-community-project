import type { CommunityConfig } from "./config-schema";
import { zonedParts } from "./time";

type FeeConfig = CommunityConfig["membership"]["fee"];

export type Period = {
  /** Stable identifier stored in the database and used in payment references, e.g. "2026", "2026-H2", "2026-03". */
  key: string;
  /** First day of the period (UTC midnight of the date in the community's timezone). */
  start: Date;
  /** First day of the next period. */
  end: Date;
  /** Date after which an unpaid fee is overdue. */
  due: Date;
};

const PERIOD_MONTHS = { year: 12, "half-year": 6, quarter: 3, month: 1 } as const;

/** The membership period that `now` falls in, or null if the community has no periodic fee. */
export function currentPeriod(fee: FeeConfig, timeZone: string, now: Date = new Date()): Period | null {
  if (fee.period === "none") return null;
  const len = PERIOD_MONTHS[fee.period];
  const { year, month } = zonedParts(now, timeZone);

  const offset = (month - fee.periodStartMonth + 12) % 12; // months since the period year began
  const anchorYear = month >= fee.periodStartMonth ? year : year - 1;
  const index = Math.floor(offset / len);

  const startMonth0 = fee.periodStartMonth - 1 + index * len; // may be >= 12
  const start = new Date(Date.UTC(anchorYear, startMonth0, 1));
  const end = new Date(Date.UTC(anchorYear, startMonth0 + len, 1));
  const due = new Date(start.getTime() + fee.graceDays * 86_400_000);

  let key: string;
  switch (fee.period) {
    case "year":
      key = fee.periodStartMonth === 1 ? `${anchorYear}` : `${anchorYear}-${String(anchorYear + 1).slice(2)}`;
      break;
    case "half-year":
      key = `${anchorYear}-H${index + 1}`;
      break;
    case "quarter":
      key = `${anchorYear}-Q${index + 1}`;
      break;
    case "month":
      key = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, "0")}`;
      break;
  }
  return { key, start, end, due };
}

/** Payment reference for a membership fee, e.g. "MEM-12-2026". */
export function membershipReference(prefix: string, memberNumber: number, periodKey: string): string {
  return `${prefix}-${memberNumber}-${periodKey}`.toUpperCase();
}

/** Payment reference for an event fee, e.g. "MEM-12-E7". */
export function eventReference(prefix: string, memberNumber: number, eventNumber: number): string {
  return `${prefix}-${memberNumber}-E${eventNumber}`.toUpperCase();
}

export type PaymentStatus = "unpaid" | "reported" | "confirmed" | "waived";

export function isSettled(status: PaymentStatus | null | undefined): boolean {
  return status === "confirmed" || status === "waived";
}
