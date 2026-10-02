import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { config, localized } from "@/lib/config";
import { publicEnv } from "@/lib/env-public";
import { getCommunitySettings } from "@/lib/settings";
import { themeCss } from "@/lib/theme";
import { SetupIncomplete } from "@/components/setup-incomplete";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getLocale();
  return {
    metadataBase: new URL(publicEnv.siteUrl),
    title: { default: config.name, template: `%s · ${config.name}` },
    description: localized(config.description, locale),
    applicationName: config.name,
  };
}

export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const configured = Boolean(publicEnv.supabaseUrl && publicEnv.supabasePublishableKey);
  const settings = configured ? await getCommunitySettings().catch(() => null) : null;
  const css = themeCss(settings?.primary ?? config.theme.primary, settings?.accent ?? config.theme.accent);

  return (
    <html lang={locale}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body className="flex min-h-screen flex-col font-sans antialiased">
        <NextIntlClientProvider>{configured ? children : <SetupIncomplete />}</NextIntlClientProvider>
      </body>
    </html>
  );
}
