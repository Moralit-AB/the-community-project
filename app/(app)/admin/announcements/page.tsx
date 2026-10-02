import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { Badge, ButtonLink, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("AdminAnnouncements"))("title") };
}

export default async function AdminAnnouncementsPage() {
  if (!config.features.announcements) notFound();
  const [t, locale] = await Promise.all([getTranslations("AdminAnnouncements"), getLocale()]);
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("announcements")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <div>
      <PageHeader title={t("title")} actions={<ButtonLink href="/admin/announcements/new">{t("new")}</ButtonLink>} />
      {!posts || posts.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("titleField")}</Th>
              <Th>{t("date")}</Th>
              <Th>{t("status")}</Th>
            </tr>
          </thead>
          <tbody>
            {posts.map((p) => (
              <tr key={p.id}>
                <Td>
                  <Link href={`/admin/announcements/${p.id}`} className="font-medium hover:underline">
                    {p.title}
                  </Link>
                  {p.pinned && (
                    <span className="ml-2">
                      <Badge tone="accent">{t("pinned")}</Badge>
                    </span>
                  )}
                </Td>
                <Td className="text-muted">{formatDate(p.published_at ?? p.created_at, locale, config.timezone)}</Td>
                <Td>
                  {p.published_at ? (
                    <Badge tone="success">{t("published")}</Badge>
                  ) : (
                    <Badge tone="warning">{t("draft")}</Badge>
                  )}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </div>
  );
}
