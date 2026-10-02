import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config } from "@/lib/config";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/time";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Announcements"))("title") };
}

export default async function AnnouncementsPage() {
  if (!config.features.announcements) notFound();
  await requireMember();
  const [t, locale] = await Promise.all([getTranslations("Announcements"), getLocale()]);
  const supabase = await createClient();
  const { data: posts } = await supabase
    .from("announcements")
    .select("id, title, body, pinned, published_at")
    .not("published_at", "is", null)
    .lte("published_at", new Date().toISOString())
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(100);

  return (
    <div>
      <PageHeader title={t("title")} description={t("intro")} />
      {posts && posts.length > 0 ? (
        <div className="space-y-3">
          {posts.map((p) => (
            <Link key={p.id} href={`/announcements/${p.id}`} className="block">
              <Card className="transition hover:border-primary">
                <div className="flex items-start justify-between gap-3">
                  <p className="text-lg font-medium">{p.title}</p>
                  {p.pinned && <Badge tone="brand">{t("pinned")}</Badge>}
                </div>
                <p className="text-xs text-muted">{formatDate(p.published_at!, locale, config.timezone)}</p>
                <p className="mt-2 line-clamp-2 text-sm text-muted">{p.body.replace(/[#*_>`]/g, "")}</p>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState>{t("empty")}</EmptyState>
      )}
    </div>
  );
}
