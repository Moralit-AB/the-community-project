import { z } from "zod";

/** A text that is either the same in every language or given per locale: `{ en: "…", sv: "…" }`. */
const localizedText = z.union([z.string().min(1), z.record(z.string(), z.string().min(1))]);

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "must be a 6-digit hex color like #4f46e5");

export const SUPPORTED_LOCALES = ["en", "sv"] as const;

export const communityConfigSchema = z
  .object({
    /** Full community name, shown in the header, emails and browser tab. */
    name: z.string().min(1).max(80),
    /** Short name for the home-screen icon (PWA). */
    shortName: z.string().min(1).max(24),
    /** One or two sentences about the community, shown on the landing page. */
    description: localizedText,
    /** Public contact address shown on the site and in the privacy policy. */
    contactEmail: z.email(),

    /** UI languages offered. Each one needs a messages/<locale>.json file. */
    locales: z.array(z.enum(SUPPORTED_LOCALES)).min(1),
    defaultLocale: z.enum(SUPPORTED_LOCALES),
    /** IANA timezone used to show and enter event times, e.g. "Europe/Stockholm". */
    timezone: z.string().refine(isValidTimezone, "must be a valid IANA timezone, e.g. Europe/Stockholm"),

    membership: z.object({
      /** If true (recommended), an admin must approve every new member. */
      requireApproval: z.boolean().default(true),
      /** Ask applicants for a short message when they request membership. */
      joinMessage: z.enum(["off", "optional", "required"]).default("optional"),
      fee: z.object({
        /** Membership fee per period. Use 0 or period "none" for a free community. */
        amount: z.number().min(0),
        /** ISO 4217 currency code, e.g. "SEK", "EUR", "USD". */
        currency: z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter currency code like SEK"),
        period: z.enum(["year", "half-year", "quarter", "month", "none"]),
        /** Month (1–12) when a period starts. 1 = January for calendar years. */
        periodStartMonth: z.number().int().min(1).max(12).default(1),
        /** Days after the period starts before a fee counts as overdue. */
        graceDays: z.number().int().min(0).max(365).default(30),
      }),
      /** Prefix for payment references, e.g. "MEM" gives "MEM-12-2026". Letters and digits only. */
      referencePrefix: z
        .string()
        .regex(/^[A-Za-z0-9]{1,8}$/, "letters and digits only, max 8 characters")
        .transform((s) => s.toUpperCase()),
    }),

    features: z.object({
      announcements: z.boolean().default(true),
      comments: z.boolean().default(true),
      emailNotifications: z.boolean().default(true),
    }),

    /** Default colors, used until an admin picks colors in Admin → Settings. */
    theme: z.object({
      primary: hexColor,
      accent: hexColor,
    }),
  })
  .superRefine((cfg, ctx) => {
    if (!cfg.locales.includes(cfg.defaultLocale)) {
      ctx.addIssue({
        code: "custom",
        path: ["defaultLocale"],
        message: `must be one of locales (${cfg.locales.join(", ")})`,
      });
    }
  });

export type CommunityConfigInput = z.input<typeof communityConfigSchema>;
export type CommunityConfig = z.output<typeof communityConfigSchema>;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

/** Used in community.config.ts to get autocompletion and type checking. */
export function defineCommunityConfig(config: CommunityConfigInput): CommunityConfigInput {
  return config;
}

/** Validates the config and throws a readable error that points at the broken field. */
export function parseCommunityConfig(input: unknown): CommunityConfig {
  const result = communityConfigSchema.safeParse(input);
  if (!result.success) {
    const lines = result.error.issues.map((i) => `  • ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`\n\ncommunity.config.ts is invalid:\n${lines.join("\n")}\n\nFix the values above and redeploy.\n`);
  }
  return result.data;
}

function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}
