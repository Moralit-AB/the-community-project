import { getTranslations } from "next-intl/server";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { NavLinks, type NavItem } from "@/components/nav-links";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const t = await getTranslations("AdminNav");
  const nav: NavItem[] = [
    { href: "/admin", label: t("overview"), exact: true },
    { href: "/admin/members", label: t("members") },
    { href: "/admin/events", label: t("events") },
    ...(config.features.announcements ? [{ href: "/admin/announcements", label: t("announcements") }] : []),
    { href: "/admin/settings", label: t("settings") },
    { href: "/admin/setup", label: t("setup") },
  ];
  return (
    <div>
      <div className="mb-6 rounded-xl border border-border bg-surface px-2">
        <NavLinks items={nav} />
      </div>
      {children}
    </div>
  );
}
