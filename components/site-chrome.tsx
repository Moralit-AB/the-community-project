import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { getCommunitySettings } from "@/lib/settings";
import type { CurrentUser } from "@/lib/auth";
import { LocaleSwitcher } from "./locale-switcher";
import { NavLinks, type NavItem } from "./nav-links";
import { buttonClass } from "./ui";

export async function Brand() {
  const settings = await getCommunitySettings();
  return (
    <Link href="/" className="flex min-w-0 items-center gap-2 font-semibold">
      {settings.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={settings.logoUrl} alt="" className="h-9 w-auto max-w-[120px] object-contain" />
      ) : (
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-fg">
          {config.name.slice(0, 1).toUpperCase()}
        </span>
      )}
      <span className="truncate">{config.name}</span>
    </Link>
  );
}

export async function SiteHeader({ user, nav }: { user: CurrentUser | null; nav?: NavItem[] }) {
  const t = await getTranslations("Nav");
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
        <Brand />
        <div className="flex items-center gap-2">
          {user ? (
            <form action="/auth/signout" method="post">
              <button className={buttonClass({ variant: "ghost", size: "sm" })}>{t("logout")}</button>
            </form>
          ) : (
            <>
              <Link href="/login" className={buttonClass({ variant: "ghost", size: "sm" })}>
                {t("login")}
              </Link>
              <Link href="/join" className={buttonClass({ size: "sm" })}>
                {t("join")}
              </Link>
            </>
          )}
        </div>
      </div>
      {nav && nav.length > 0 && (
        <div className="mx-auto max-w-5xl px-4">
          <NavLinks items={nav} />
        </div>
      )}
    </header>
  );
}

export async function SiteFooter() {
  const t = await getTranslations("Footer");
  const locale = await getLocale();
  return (
    <footer className="mt-auto border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>
            © {new Date().getFullYear()} {config.name}
          </span>
          <Link href="/privacy" className="hover:text-foreground hover:underline">
            {t("privacy")}
          </Link>
          <a href={`mailto:${config.contactEmail}`} className="hover:text-foreground hover:underline">
            {config.contactEmail}
          </a>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs">{t("poweredBy")}</span>
          <LocaleSwitcher key={locale} locales={config.locales} />
        </div>
      </div>
    </footer>
  );
}
