import type { Database } from "./database.types";

type Tables = Database["public"]["Tables"];
export type Profile = Tables["profiles"]["Row"];
export type EventRow = Tables["events"]["Row"];
export type AttendeeRow = Tables["event_attendees"]["Row"];
export type Announcement = Tables["announcements"]["Row"];
export type Comment = Tables["announcement_comments"]["Row"];
export type MembershipPayment = Tables["membership_payments"]["Row"];
export type PaymentDetails = Tables["payment_details"]["Row"];
export type MemberStatus = Database["public"]["Enums"]["member_status"];
export type PaymentStatus = Database["public"]["Enums"]["payment_status"];

/** What every Server Action returns, shown by <ActionForm>. */
export type ActionResult = { ok: boolean; message?: string } | null;
