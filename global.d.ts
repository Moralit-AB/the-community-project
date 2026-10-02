import type en from "./messages/en.json";
import type { Locale } from "./lib/config-schema";

// Type-checks every translation key against messages/en.json.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
