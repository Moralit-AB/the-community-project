import "server-only";
import { createTranslator } from "next-intl";
import { config, type Locale } from "@/lib/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { safeColor } from "@/lib/theme";
import { formatRange } from "@/lib/time";
import { isLocale, loadMessages } from "@/i18n/locale";
import { renderEmail, type EmailContent } from "./templates";
import { sendEmail } from "./send";

// Who gets which email. Every function here is safe to call more than once:
// notification_log makes sure each email goes to each person only once.

type Admin = ReturnType<typeof createAdminClient>;
type Recipient = { id: string; email: string; locale: string | null };

async function translator(locale: Locale) {
  return createTranslator({ locale, messages: await loadMessages(locale), namespace: "Email" });
}

async function primaryColor(admin: Admin) {
  const { data } = await admin.from("community_settings").select("primary_color").eq("id", 1).maybeSingle();
  return safeColor(data?.primary_color, config.theme.primary);
}

/** Records that an email is about to go out. Returns false if it was already sent. */
async function claim(admin: Admin, kind: string, refId: string, recipientId: string | null) {
  const { error } = await admin.from("notification_log").insert({ kind, ref_id: refId, recipient_id: recipientId });
  if (error) {
    if (error.code === "23505") return false; // already sent
    throw error;
  }
  return true;
}

async function release(admin: Admin, kind: string, refId: string, recipientId: string | null) {
  let q = admin.from("notification_log").delete().eq("kind", kind).eq("ref_id", refId);
  q = recipientId ? q.eq("recipient_id", recipientId) : q.is("recipient_id", null);
  await q;
}

/** Sends a personalised email to each recipient in their own language, a few at a time. */
async function sendToEach(
  admin: Admin,
  recipients: Recipient[],
  kind: string,
  refId: string,
  build: (
    t: Awaited<ReturnType<typeof translator>>,
    locale: Locale,
  ) => Omit<EmailContent, "primaryColor"> & { subject: string },
) {
  const color = await primaryColor(admin);
  const BATCH = 5;
  for (let i = 0; i < recipients.length; i += BATCH) {
    await Promise.all(
      recipients.slice(i, i + BATCH).map(async (r) => {
        if (!(await claim(admin, kind, refId, r.id))) return;
        const locale = isLocale(r.locale) ? r.locale : config.defaultLocale;
        const t = await translator(locale);
        const { subject, ...content } = build(t, locale);
        const { html, text } = renderEmail({ ...content, primaryColor: color }, t("privacyLink"));
        const sent = await sendEmail({ to: r.email, subject, html, text });
        if (!sent) await release(admin, kind, refId, r.id);
      }),
    );
  }
}

export async function notifyAdminsOfJoinRequest(userId: string) {
  const admin = createAdminClient();
  const { data: applicant } = await admin.from("profiles").select("*").eq("id", userId).single();
  if (!applicant || applicant.status !== "pending") return;

  const { data: admins } = await admin
    .from("profiles")
    .select("id, email, locale")
    .eq("role", "admin")
    .eq("status", "approved");

  await sendToEach(admin, admins ?? [], "join_request", userId, (t) => ({
    subject: t("joinRequest.subject", { name: applicant.display_name }),
    heading: t("joinRequest.heading"),
    paragraphs: [t("joinRequest.body", { name: applicant.display_name, email: applicant.email })],
    quote: applicant.join_message ?? undefined,
    cta: { label: t("joinRequest.cta"), path: "/admin/members?status=pending" },
    footer: t("footerAdmin"),
  }));
}

export async function notifyMemberDecision(userId: string, decision: "approved" | "rejected") {
  const admin = createAdminClient();
  const { data: member } = await admin.from("profiles").select("id, email, locale").eq("id", userId).single();
  if (!member) return;

  // A member can be approved again later (e.g. after a suspension), so key by date.
  const refId = `${userId}:${new Date().toISOString().slice(0, 10)}`;
  await sendToEach(admin, [member], `member_${decision}`, refId, (t) =>
    decision === "approved"
      ? {
          subject: t("approved.subject", { community: config.name }),
          heading: t("approved.heading"),
          paragraphs: [t("approved.body", { community: config.name })],
          cta: { label: t("approved.cta"), path: "/login" },
          footer: t("footerMember"),
        }
      : {
          subject: t("rejected.subject", { community: config.name }),
          heading: t("rejected.heading"),
          paragraphs: [t("rejected.body", { community: config.name, contact: config.contactEmail })],
          footer: t("footerMember"),
        },
  );
}

async function approvedMembers(admin: Admin, preference: "notify_events" | "notify_announcements") {
  const { data } = await admin
    .from("profiles")
    .select("id, email, locale")
    .eq("status", "approved")
    .eq(preference, true);
  return data ?? [];
}

export async function notifyNewEvent(eventId: string) {
  if (!config.features.emailNotifications) return;
  const admin = createAdminClient();
  const { data: event } = await admin.from("events").select("*").eq("id", eventId).single();
  if (!event || !event.published || new Date(event.starts_at) < new Date()) return;

  await sendToEach(admin, await approvedMembers(admin, "notify_events"), "event_published", eventId, (t, locale) => ({
    subject: t("newEvent.subject", { title: event.title }),
    heading: event.title,
    paragraphs: [
      t("newEvent.body", { community: config.name }),
      `${formatRange(event.starts_at, event.ends_at, locale, config.timezone)}${event.location ? `\n${event.location}` : ""}`,
    ],
    cta: { label: t("newEvent.cta"), path: `/events/${event.id}` },
    footer: t("footerPreferences"),
  }));
}

export async function notifyNewAnnouncement(announcementId: string) {
  if (!config.features.emailNotifications || !config.features.announcements) return;
  const admin = createAdminClient();
  const { data: post } = await admin.from("announcements").select("*").eq("id", announcementId).single();
  if (!post?.published_at || new Date(post.published_at) > new Date()) return;

  const excerpt = post.body
    .replace(/[#*_>`[\]()-]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
  await sendToEach(
    admin,
    await approvedMembers(admin, "notify_announcements"),
    "announcement_published",
    announcementId,
    (t) => ({
      subject: t("newAnnouncement.subject", { title: post.title }),
      heading: post.title,
      paragraphs: [excerpt + (post.body.length > 280 ? "…" : "")],
      cta: { label: t("newAnnouncement.cta"), path: `/announcements/${post.id}` },
      footer: t("footerPreferences"),
    }),
  );
}

/** Reminds attendees about events starting within the next 24 hours. Called by the daily cron job. */
export async function sendEventReminders(): Promise<number> {
  if (!config.features.emailNotifications) return 0;
  const admin = createAdminClient();
  const now = new Date();
  const until = new Date(now.getTime() + 24 * 3600 * 1000);
  const { data: events } = await admin
    .from("events")
    .select("*")
    .eq("published", true)
    .gt("starts_at", now.toISOString())
    .lte("starts_at", until.toISOString());

  let count = 0;
  for (const event of events ?? []) {
    const { data: rows } = await admin
      .from("event_attendees")
      .select("member_id, profiles!event_attendees_member_id_fkey(id, email, locale, status, notify_events)")
      .eq("event_id", event.id)
      .eq("status", "going");
    const recipients = (rows ?? [])
      .map((r) => r.profiles)
      .filter((p): p is NonNullable<typeof p> => Boolean(p && p.status === "approved" && p.notify_events));
    count += recipients.length;
    await sendToEach(admin, recipients, "event_reminder", event.id, (t, locale) => ({
      subject: t("reminder.subject", { title: event.title }),
      heading: t("reminder.heading", { title: event.title }),
      paragraphs: [
        `${formatRange(event.starts_at, event.ends_at, locale, config.timezone)}${event.location ? `\n${event.location}` : ""}`,
        t("reminder.body"),
      ],
      cta: { label: t("reminder.cta"), path: `/events/${event.id}` },
      footer: t("footerPreferences"),
    }));
  }
  return count;
}
