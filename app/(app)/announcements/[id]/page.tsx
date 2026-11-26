import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { requireMember } from "@/lib/auth";
import { config } from "@/lib/config";
import { memberNames } from "@/lib/members";
import { createClient } from "@/lib/supabase/server";
import { formatDate, formatDateTime } from "@/lib/time";
import { ActionForm } from "@/components/action-form";
import { Markdown } from "@/components/markdown";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Card, SectionTitle, Textarea } from "@/components/ui";
import { addComment, deleteComment } from "./actions";

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("announcements").select("*").eq("id", id).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: PageProps<"/announcements/[id]">): Promise<Metadata> {
  return { title: (await load((await params).id))?.title };
}

export default async function AnnouncementPage({ params }: PageProps<"/announcements/[id]">) {
  if (!config.features.announcements) notFound();
  const user = await requireMember();
  const post = await load((await params).id);
  if (!post) notFound();

  const [t, locale] = await Promise.all([getTranslations("Announcements"), getLocale()]);
  const supabase = await createClient();
  const { data: comments } = config.features.comments
    ? await supabase.from("announcement_comments").select("*").eq("announcement_id", post.id).order("created_at")
    : { data: [] };
  const names = await memberNames([post.author_id, ...(comments ?? []).map((c) => c.author_id)]);
  const isAdmin = user.profile.role === "admin";
  // The text of deleted comments is kept for moderation, readable by admins only (RLS).
  const deletedIds = (comments ?? []).filter((c) => c.deleted_at).map((c) => c.id);
  const { data: archived } =
    isAdmin && deletedIds.length > 0
      ? await supabase.from("announcement_comment_archive").select("*").in("comment_id", deletedIds)
      : { data: [] };
  const archive = new Map((archived ?? []).map((a) => [a.comment_id, a]));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/announcements" className="text-sm text-muted hover:underline">
        ← {t("back")}
      </Link>
      <article>
        <h1 className="text-3xl font-semibold">{post.title}</h1>
        <p className="mt-1 text-sm text-muted">
          {post.published_at ? formatDate(post.published_at, locale, config.timezone) : t("draft")}
          {post.author_id && names.get(post.author_id) ? ` · ${names.get(post.author_id)}` : ""}
        </p>
        <Card className="mt-4">
          <Markdown>{post.body}</Markdown>
        </Card>
      </article>

      {config.features.comments && (
        <section className="space-y-3">
          <SectionTitle>{t("comments", { count: (comments ?? []).filter((c) => !c.deleted_at).length })}</SectionTitle>
          {(comments ?? []).map((c) => (
            <Card key={c.id} className="py-3">
              <div className="flex items-center justify-between gap-2 text-xs text-muted">
                <span className="font-medium text-foreground">
                  {(c.author_id && names.get(c.author_id)) || t("formerMember")}
                </span>
                <span>{formatDateTime(c.created_at, locale, config.timezone)}</span>
              </div>
              {c.deleted_at ? (
                <>
                  <p className="mt-1 text-sm italic text-muted">{t("commentDeleted")}</p>
                  {archive.has(c.id) && (
                    <div className="mt-2 space-y-1 rounded-md border border-dashed border-border p-2">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <Badge tone="warning">{t("deletedAdminOnly")}</Badge>
                        <span>
                          {archive.get(c.id)!.deleted_by && archive.get(c.id)!.deleted_by === c.author_id
                            ? t("deletedByAuthor")
                            : t("deletedByAdmin")}
                        </span>
                      </div>
                      <p className="whitespace-pre-wrap text-sm text-muted">{archive.get(c.id)!.body}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="mt-1 whitespace-pre-wrap text-sm">{c.body}</p>
                  {(c.author_id === user.id || isAdmin) && (
                    <form action={deleteComment.bind(null, post.id, c.id)} className="mt-1 text-right">
                      <button className="text-xs text-muted underline hover:text-red-600">{t("deleteComment")}</button>
                    </form>
                  )}
                </>
              )}
            </Card>
          ))}
          {post.allow_comments ? (
            <ActionForm action={addComment.bind(null, post.id)} resetOnSuccess hideSuccess className="space-y-2">
              <Textarea
                name="body"
                required
                maxLength={5000}
                placeholder={t("commentPlaceholder")}
                aria-label={t("commentPlaceholder")}
              />
              <SubmitButton>{t("postComment")}</SubmitButton>
            </ActionForm>
          ) : (
            <p className="text-sm text-muted">{t("commentsClosed")}</p>
          )}
        </section>
      )}
    </div>
  );
}
