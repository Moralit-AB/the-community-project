import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { config } from "@/lib/config";
import { isLocale, LOCALE_COOKIE, loadMessages, negotiateLocale } from "./locale";

// Locale order: the NEXT_LOCALE cookie (set at login from the profile, or by the language
// switcher), then the browser's Accept-Language, then config.defaultLocale.
export default getRequestConfig(async () => {
  const cookieLocale = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(cookieLocale) ? cookieLocale : negotiateLocale((await headers()).get("accept-language"));

  return {
    locale,
    timeZone: config.timezone,
    messages: await loadMessages(locale),
  };
});
