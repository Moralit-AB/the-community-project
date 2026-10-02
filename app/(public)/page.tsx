import { redirect } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { config, localized } from "@/lib/config";
import { getCommunitySettings } from "@/lib/settings";
import { Markdown } from "@/components/markdown";
import { ButtonLink, Card } from "@/components/ui";

export default async function LandingPage() {
  const user = await getCurrentUser();
  if (user) redirect(user.profile.status === "approved" ? "/home" : "/pending");

  const [t, locale, settings] = await Promise.all([getTranslations("Landing"), getLocale(), getCommunitySettings()]);

  return (
    <div className="mx-auto max-w-2xl text-center">
      {settings.logoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={settings.logoUrl}
          alt={config.name}
          className="mx-auto mb-6 h-28 w-auto max-w-[240px] object-contain"
        />
      )}
      <h1 className="text-4xl font-bold tracking-tight">{config.name}</h1>
      <p className="mt-4 text-lg text-muted">{localized(config.description, locale)}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <ButtonLink href="/join" size="lg">
          {t("join")}
        </ButtonLink>
        <ButtonLink href="/login" size="lg" variant="secondary">
          {t("login")}
        </ButtonLink>
      </div>
      {settings.welcomeText && (
        <Card className="mt-12 text-left">
          <Markdown>{settings.welcomeText}</Markdown>
        </Card>
      )}
      <div className="mt-12 grid gap-4 text-left sm:grid-cols-3">
        {(["events", "membership", "news"] as const).map((key) => (
          <Card key={key}>
            <p className="font-semibold">{t(`features.${key}.title`)}</p>
            <p className="mt-1 text-sm text-muted">{t(`features.${key}.body`)}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
