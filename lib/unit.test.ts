import { describe, expect, it } from "vitest";
import rawConfig from "@/community.config";
import { parseCommunityConfig } from "./config-schema";
import { csvCell, toCsv } from "./csv";
import { currentPeriod, eventReference, isOverdue, membershipReference } from "./membership";
import { contrastRatio, readableTextColor, safeColor, themeCss } from "./theme";
import { formatRange, utcToZonedLocalInput, zonedLocalToUtc } from "./time";

const fee = { amount: 200, currency: "SEK", period: "year" as const, periodStartMonth: 1, graceDays: 30 };
const tz = "Europe/Stockholm";

describe("community.config.ts", () => {
  it("the shipped config is valid", () => {
    expect(() => parseCommunityConfig(rawConfig)).not.toThrow();
  });

  it("gives a readable error naming the bad field", () => {
    const bad = { ...rawConfig, defaultLocale: "sv", locales: ["en"], timezone: "Mars/Olympus" };
    expect(() => parseCommunityConfig(bad)).toThrow(/defaultLocale[\s\S]*timezone|timezone[\s\S]*defaultLocale/);
  });

  it("uppercases the reference prefix", () => {
    const cfg = parseCommunityConfig({
      ...rawConfig,
      membership: { ...rawConfig.membership, referencePrefix: "abc" },
    });
    expect(cfg.membership.referencePrefix).toBe("ABC");
  });
});

describe("membership periods", () => {
  it("calendar year", () => {
    const p = currentPeriod(fee, tz, new Date("2026-03-15T12:00:00Z"))!;
    expect(p.key).toBe("2026");
    expect(p.start.toISOString()).toBe("2025-12-31T23:00:00.000Z"); // midnight in Stockholm
    expect(p.end.toISOString()).toBe("2026-12-31T23:00:00.000Z");
    expect(p.due.toISOString()).toBe("2026-01-30T23:00:00.000Z");
  });

  it("uses the community timezone at new year", () => {
    // 23:30 UTC on Dec 31 is already Jan 1 in Stockholm.
    expect(currentPeriod(fee, tz, new Date("2026-12-31T23:30:00Z"))!.key).toBe("2027");
  });

  it("school year starting in September", () => {
    const f = { ...fee, periodStartMonth: 9 };
    expect(currentPeriod(f, tz, new Date("2026-10-01T12:00:00Z"))!.key).toBe("2026-27");
    expect(currentPeriod(f, tz, new Date("2027-02-01T12:00:00Z"))!.key).toBe("2026-27");
    expect(currentPeriod(f, tz, new Date("2027-09-01T12:00:00Z"))!.key).toBe("2027-28");
  });

  it("half-years, quarters and months", () => {
    const d = new Date("2026-08-10T12:00:00Z");
    expect(currentPeriod({ ...fee, period: "half-year" }, tz, d)!.key).toBe("2026-H2");
    expect(currentPeriod({ ...fee, period: "quarter" }, tz, d)!.key).toBe("2026-Q3");
    expect(currentPeriod({ ...fee, period: "month" }, tz, d)!.key).toBe("2026-08");
    const q = currentPeriod({ ...fee, period: "quarter", periodStartMonth: 11 }, tz, new Date("2027-01-05T12:00:00Z"))!;
    expect(q.key).toBe("2026-Q1");
    expect(q.start.toISOString()).toBe("2026-10-31T23:00:00.000Z");
    expect(q.end.toISOString()).toBe("2027-01-31T23:00:00.000Z");
  });

  it("overdue counts from approval for members who join mid-period", () => {
    const p = currentPeriod(fee, tz, new Date("2026-10-02T12:00:00Z"))!;
    const now = new Date("2026-10-02T12:00:00Z");
    expect(isOverdue(p, "unpaid", "2026-01-05T00:00:00Z", 30, now)).toBe(true);
    expect(isOverdue(p, "unpaid", "2026-09-20T00:00:00Z", 30, now)).toBe(false);
    expect(isOverdue(p, "reported", "2026-01-05T00:00:00Z", 30, now)).toBe(false);
  });

  it("no period", () => {
    expect(currentPeriod({ ...fee, period: "none" }, tz)).toBeNull();
  });

  it("references", () => {
    expect(membershipReference("MEM", 12, "2026-h1")).toBe("MEM-12-2026-H1");
    expect(eventReference("MEM", 12, 7)).toBe("MEM-12-E7");
  });
});

describe("time", () => {
  it("round-trips wall-clock times through UTC, summer and winter", () => {
    expect(zonedLocalToUtc("2026-06-20T18:00", tz).toISOString()).toBe("2026-06-20T16:00:00.000Z");
    expect(zonedLocalToUtc("2026-01-20T18:00", tz).toISOString()).toBe("2026-01-20T17:00:00.000Z");
    expect(utcToZonedLocalInput("2026-06-20T16:00:00Z", tz)).toBe("2026-06-20T18:00");
    expect(zonedLocalToUtc("2026-06-20T18:00", "America/New_York").toISOString()).toBe("2026-06-20T22:00:00.000Z");
  });

  it("formats same-day ranges compactly", () => {
    const s = formatRange("2026-06-20T16:00:00Z", "2026-06-20T21:00:00Z", "en-GB", tz);
    expect(s).toContain("18:00");
    expect(s).toMatch(/– 23:00$/);
  });
});

describe("theme", () => {
  it("picks readable text colors", () => {
    expect(readableTextColor("#4f46e5")).toBe("#ffffff");
    expect(readableTextColor("#f59e0b")).toBe("#000000");
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21);
  });

  it("rejects anything that is not a hex color (no CSS injection)", () => {
    expect(safeColor("red;}body{display:none", "#111111")).toBe("#111111");
    expect(themeCss("#4F46E5".toLowerCase(), "#f59e0b")).toContain("--brand-primary:#4f46e5");
  });
});

describe("csv", () => {
  it("quotes and neutralises formulas", () => {
    expect(csvCell('a "b", c')).toBe('"a ""b"", c"');
    expect(csvCell("=HYPERLINK(1)")).toBe("'=HYPERLINK(1)");
    expect(csvCell(null)).toBe("");
    expect(toCsv(["a"], [[1]])).toBe("﻿a\r\n1\r\n");
  });
});
