// The daily job (/api/cron/daily) records a heartbeat each time it runs. Supabase pauses a free
// project after about a week with too little database activity, so admins are warned well
// before that if the job stops running.

/** Older than this, the daily job has missed at least one run. */
export const HEARTBEAT_STALE_HOURS = 48;

export type HeartbeatStatus = "ok" | "stale" | "never";

export function heartbeatStatus(lastAt: string | null | undefined, now: Date = new Date()): HeartbeatStatus {
  if (!lastAt) return "never";
  const at = new Date(lastAt).getTime();
  if (Number.isNaN(at)) return "never";
  return now.getTime() - at > HEARTBEAT_STALE_HOURS * 3600 * 1000 ? "stale" : "ok";
}

/** Whole days since the last heartbeat (0 when it ran less than a day ago). */
export function heartbeatAgeDays(lastAt: string, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - new Date(lastAt).getTime()) / (24 * 3600 * 1000)));
}
