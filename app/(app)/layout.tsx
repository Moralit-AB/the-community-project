import { getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config } from "@/lib/config";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { PrivacyUpdateBanner } from "@/components/privacy-banner";
import type { NavItem } from "@/components/nav-links";

export default async function MemberLayout({ children }: { children: React.ReactNode }) {
  const user = await requireMember();
  const t = await getTranslations("Nav");

  const nav: NavItem[] = [
    { href: "/home", label: t("home") },
    { href: "/events", label: t("events") },
    ...(config.features.announcements ? [{ href: "/announcements", label: t("announcements") }] : []),
    { href: "/membership", label: t("membership") },
    { href: "/profile", label: t("profile") },
    ...(user.profile.role === "admin" ? [{ href: "/admin", label: t("admin") }] : []),
  ];

  return (
    <>
      <SiteHeader user={user} nav={nav} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <PrivacyUpdateBanner acceptedVersion={user.profile.privacy_accepted_version} />
        {children}
      </main>
      <SiteFooter />
    </>
  );
}
