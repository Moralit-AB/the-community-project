import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ActionButton } from "@/components/action-button";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { deleteAnnouncement } from "../actions";
import { AnnouncementForm } from "../announcement-form";

export default async function EditAnnouncementPage({ params }: PageProps<"/admin/announcements/[id]">) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = await createClient();
  const { data: post } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle();
  if (!post) notFound();
  const t = await getTranslations("AdminAnnouncements");

  return (
    <div className="max-w-3xl space-y-4">
      <Link href="/admin/announcements" className="text-sm text-muted hover:underline">
        ← {t("title")}
      </Link>
      <PageHeader
        title={t("edit")}
        actions={
          <>
            {post.published_at && (
              <ButtonLink href={`/announcements/${post.id}`} variant="secondary">
                {t("view")}
              </ButtonLink>
            )}
            <ActionButton action={deleteAnnouncement.bind(null, post.id)} variant="danger" confirm={t("deleteConfirm")}>
              {t("delete")}
            </ActionButton>
          </>
        }
      />
      <Card>
        <AnnouncementForm post={post} />
      </Card>
    </div>
  );
}
