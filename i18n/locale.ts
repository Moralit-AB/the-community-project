import { config, type Locale } from "@/lib/config";

export const LOCALE_COOKIE = "NEXT_LOCALE";

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (config.locales as string[]).includes(value);
}

/** Picks the best configured locale from an Accept-Language header. */
export function negotiateLocale(acceptLanguage: string | null): Locale {
  if (acceptLanguage) {
    const wanted = acceptLanguage
      .split(",")
      .map((part) => {
        const [tag, q] = part.trim().split(";q=");
        return { lang: tag.toLowerCase().split("-")[0], q: q ? Number(q) : 1 };
      })
      .sort((a, b) => b.q - a.q);
    for (const { lang } of wanted) if (isLocale(lang)) return lang;
  }
  return config.defaultLocale;
}

export async function loadMessages(locale: Locale) {
  return (await import(`../messages/${locale}.json`)).default;
}
