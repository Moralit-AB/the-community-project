import { expect, type Page } from "@playwright/test";

const MAILPIT = process.env.MAILPIT_URL ?? "http://127.0.0.1:54324";

type MailSummary = { ID: string; Subject: string; To: { Address: string }[] };

/** Waits for an email to `to` whose subject matches, and returns its text. */
export async function waitForEmail(to: string, subject: RegExp, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const res = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${to}`)}`);
    const { messages } = (await res.json()) as { messages: MailSummary[] };
    const hit = messages.find((m) => subject.test(m.Subject));
    if (hit) {
      const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${hit.ID}`)).json()) as { Text: string; HTML: string };
      return msg.HTML || msg.Text;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`No email to ${to} matching ${subject}`);
}

export async function clearMailbox() {
  await fetch(`${MAILPIT}/api/v1/messages`, { method: "DELETE" });
}

/** Opens the magic link from a Supabase auth email, pointed at the app under test. */
export async function followMagicLink(page: Page, html: string) {
  const match = /href="[^"]*?(\/auth\/confirm\?token_hash=[^"]+)"/.exec(html);
  expect(match, "magic link in email").toBeTruthy();
  await page.goto(match![1].replace(/&amp;/g, "&"));
}

/** One-click login through the local-only /dev/login page. */
export async function devLogin(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/dev/login");
  await page.locator("form", { hasText: email }).getByRole("button", { name: "Log in" }).click();
  await page.waitForURL((url) => !url.pathname.startsWith("/dev/login"));
}

/** Accepts window.confirm() dialogs. */
export function autoConfirm(page: Page) {
  page.on("dialog", (d) => d.accept());
}
