import type { Metadata } from "next";
import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import { goingCounts } from "@/lib/events";
import { createClient } from "@/lib/supabase/server";
import { formatRange } from "@/lib/time";
import { Badge, ButtonLink, EmptyState, PageHeader, Table, Td, Th } from "@/components/ui";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("AdminEvents"))("title") };
}

export default async function AdminEventsPage() {
  const [t, locale] = await Promise.all([getTranslations("AdminEvents"), getLocale()]);
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: false })
    .limit(200);
  const counts = await goingCounts((events ?? []).map((e) => e.id));
  const now = new Date();

  return (
    <div>
      <PageHeader title={t("title")} actions={<ButtonLink href="/admin/events/new">{t("new")}</ButtonLink>} />
      {!events || events.length === 0 ? (
        <EmptyState>{t("empty")}</EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>{t("fields.title")}</Th>
              <Th>{t("when")}</Th>
              <Th>{t("going")}</Th>
              <Th>{t("status")}</Th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <tr key={e.id}>
                <Td>
                  <Link href={`/admin/events/${e.id}`} className="font-medium hover:underline">
                    {e.title}
                  </Link>
                </Td>
                <Td className="text-muted">{formatRange(e.starts_at, e.ends_at, locale, config.timezone)}</Td>
                <Td>
                  {counts.get(e.id) ?? 0}
                  {e.capacity ? ` / ${e.capacity}` : ""}
                </Td>
                <Td>
                  {!e.published ? (
                    <Badge tone="warning">{t("draft")}</Badge>
                  ) : new Date(e.starts_at) < now ? (
                    <Badge>{t("past")}</Badge>
                  ) : (
                    <Badge tone="success">{t("published")}</Badge>
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
