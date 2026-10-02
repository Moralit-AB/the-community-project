// Timezone helpers that need no external library. Event times are stored in UTC and
// shown and entered in the community's timezone (config.timezone).

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

export function zonedParts(date: Date, timeZone: string): Parts {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map = Object.fromEntries(fmt.formatToParts(date).map((p) => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour),
    minute: Number(map.minute),
    second: Number(map.second),
  };
}

/** Offset of `timeZone` from UTC at `date`, in milliseconds (e.g. +2h for Stockholm in summer). */
function offsetMs(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Converts a wall-clock time in `timeZone` (as typed into <input type="datetime-local">,
 * e.g. "2026-06-20T18:00") into a UTC Date.
 */
export function zonedLocalToUtc(local: string, timeZone: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!m) throw new Error(`Invalid date-time: ${local}`);
  const wall = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  // First guess, then correct once for DST transitions.
  let utc = wall - offsetMs(new Date(wall), timeZone);
  utc = wall - offsetMs(new Date(utc), timeZone);
  return new Date(utc);
}

/** Formats a UTC date as a value for <input type="datetime-local"> in `timeZone`. */
export function utcToZonedLocalInput(date: Date | string, timeZone: string): string {
  const p = zonedParts(new Date(date), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}

export function formatDateTime(date: Date | string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export function formatDate(date: Date | string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, day: "numeric", month: "long", year: "numeric" }).format(
    new Date(date),
  );
}

export function formatTime(date: Date | string, locale: string, timeZone: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(date));
}

/** "Sat 20 Jun 2026, 18:00 – 23:00", or the full end date when the event spans several days. */
export function formatRange(start: Date | string, end: Date | string | null, locale: string, timeZone: string): string {
  const s = formatDateTime(start, locale, timeZone);
  if (!end) return s;
  const sameDay =
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(start)) ===
    new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date(end));
  return `${s} – ${sameDay ? formatTime(end, locale, timeZone) : formatDateTime(end, locale, timeZone)}`;
}

export function formatMoney(amount: number, currency: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}
