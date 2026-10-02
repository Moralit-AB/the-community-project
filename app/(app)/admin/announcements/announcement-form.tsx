import { getTranslations } from "next-intl/server";
import { config } from "@/lib/config";
import type { Announcement } from "@/lib/types";
import { ActionForm } from "@/components/action-form";
import { SubmitButton } from "@/components/submit-button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui";
import { saveAnnouncement } from "./actions";

export async function AnnouncementForm({ post }: { post?: Announcement }) {
  const t = await getTranslations("AdminAnnouncements");
  return (
    <ActionForm action={saveAnnouncement.bind(null, post?.id ?? null)} className="space-y-5">
      <Field label={t("titleField")} htmlFor="title">
        <Input id="title" name="title" defaultValue={post?.title} maxLength={200} required />
      </Field>
      <Field label={t("body")} hint={t("markdownHint")} htmlFor="body">
        <Textarea id="body" name="body" defaultValue={post?.body} rows={12} maxLength={50000} />
      </Field>
      <div className="space-y-2">
        <Checkbox name="pinned" defaultChecked={post?.pinned ?? false} label={t("pinned")} />
        {config.features.comments && (
          <Checkbox name="allow_comments" defaultChecked={post?.allow_comments ?? true} label={t("allowComments")} />
        )}
        <Checkbox
          name="published"
          defaultChecked={Boolean(post?.published_at)}
          label={config.features.emailNotifications ? t("publishNotify") : t("publish")}
        />
      </div>
      <SubmitButton>{post ? t("save") : t("create")}</SubmitButton>
    </ActionForm>
  );
}
