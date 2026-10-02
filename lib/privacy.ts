import { config } from "@/lib/config";
import { publicEnv } from "@/lib/env-public";

/** Fills in {{community}}, {{contactEmail}} and {{siteUrl}} in the privacy policy text. */
export function fillPlaceholders(body: string) {
  return body
    .replaceAll("{{community}}", config.name)
    .replaceAll("{{contactEmail}}", config.contactEmail)
    .replaceAll("{{siteUrl}}", publicEnv.siteUrl);
}
