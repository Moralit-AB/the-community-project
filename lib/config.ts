import rawConfig from "@/community.config";
import { parseCommunityConfig, type Locale } from "./config-schema";

/** The validated community configuration. Importing this fails the build if community.config.ts is invalid. */
export const config = parseCommunityConfig(rawConfig);

export type { Locale };

/** Picks the right language from a text that is either a plain string or `{ en, sv, ... }`. */
export function localized(value: string | Record<string, string>, locale: string): string {
  if (typeof value === "string") return value;
  return value[locale] ?? value[config.defaultLocale] ?? Object.values(value)[0] ?? "";
}

export const hasMembershipFee = config.membership.fee.period !== "none" && config.membership.fee.amount > 0;
