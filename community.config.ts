// ─────────────────────────────────────────────────────────────────────────────
//  community.config.ts: the one file you edit to make this platform yours.
//
//  You can edit it directly on GitHub (open the file and click the pencil icon).
//  After you commit, Vercel redeploys automatically. If a value is invalid, the
//  deployment fails with a message that names the field to fix.
//
//  Logo, colors, payment details and the privacy policy are NOT set here.
//  Admins change those live in the app, under Admin → Settings.
// ─────────────────────────────────────────────────────────────────────────────
import { defineCommunityConfig } from "./lib/config-schema";

export default defineCommunityConfig({
  // Your community's name, shown in the header, browser tab and emails.
  name: "My Community",
  // A short name (max 24 characters) used when members add the site to their home screen.
  shortName: "Community",
  // Shown on the landing page. Either one text, or one per language as below.
  description: {
    en: "A friendly community. Request membership to join our events and stay in the loop.",
    sv: "En vänlig gemenskap. Ansök om medlemskap för att delta i våra evenemang och hålla dig uppdaterad.",
  },
  // A public contact address (shown on the site and in the privacy policy).
  contactEmail: "hello@example.org",

  // Languages members can choose between ("en" = English, "sv" = Swedish).
  locales: ["en", "sv"],
  // Language used when we can't tell what a visitor prefers.
  defaultLocale: "en",
  // Timezone used for event times. Full list:
  // https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  timezone: "Europe/Stockholm",

  membership: {
    // true = an admin must approve each new member (recommended).
    requireApproval: true,
    // Ask applicants "Why do you want to join?": "off", "optional" or "required".
    joinMessage: "optional",
    fee: {
      // The membership fee per period. Set amount to 0 (or period to "none") if membership is free.
      amount: 200,
      // 3-letter currency code: "SEK", "EUR", "USD", "NOK", "DKK", "GBP", ...
      currency: "SEK",
      // How often members pay: "year", "half-year", "quarter", "month" or "none".
      period: "year",
      // The month a period starts (1 = January). E.g. 9 for a school year starting in September.
      periodStartMonth: 1,
      // How many days into a period before an unpaid fee is shown as overdue.
      graceDays: 30,
    },
    // Members put this reference on their payment, e.g. "MEM-12-2026" (letters/digits, max 8).
    referencePrefix: "MEM",
  },

  // Turn parts of the platform on or off.
  features: {
    announcements: true, // news posts from admins
    comments: true, // members can comment on announcements
    emailNotifications: true, // emails about new events, announcements and reminders
  },

  // Starting colors (hex). Admins can change these later in Admin → Settings.
  theme: {
    primary: "#4f46e5",
    accent: "#f59e0b",
  },
});
