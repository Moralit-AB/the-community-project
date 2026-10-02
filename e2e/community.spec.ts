import { expect, test } from "@playwright/test";
import { autoConfirm, clearMailbox, devLogin, followMagicLink, waitForEmail } from "./helpers";

// These tests expect a freshly seeded local database (`npm run setup:local -- --reset`).
test.describe.configure({ mode: "serial" });

const applicant = `newbie-${Date.now()}@example.test`;

test("a visitor requests membership with a real magic link and lands on the pending page", async ({ page }) => {
  await clearMailbox();
  await page.goto("/join");
  await page.getByLabel("Your name").fill("Nina Newbie");
  await page.getByLabel("Email address").fill(applicant);
  await page.getByLabel(/Tell us a little/).fill("I love picnics.");
  await page.getByLabel(/privacy policy/).check();
  await page.getByRole("button", { name: "Request membership" }).click();
  await expect(page.getByText("Check your inbox")).toBeVisible();

  await followMagicLink(page, await waitForEmail(applicant, /login link/i));
  await expect(page).toHaveURL(/\/pending$/);
  await expect(page.getByRole("heading", { name: "Thanks, Nina Newbie!" })).toBeVisible();

  // A pending member can't reach member pages.
  await page.goto("/events");
  await expect(page).toHaveURL(/\/pending$/);

  // Admins are emailed about the request.
  await waitForEmail("admin@example.test", /New membership request: Nina Newbie/);
});

test("an admin approves the request and the new member gets an email", async ({ page }) => {
  autoConfirm(page);
  await devLogin(page, "admin@example.test");
  await page.goto("/admin/members?status=pending");
  const row = page.getByRole("row", { name: /Nina Newbie/ });
  await expect(row).toContainText("I love picnics.");
  await row.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByRole("row", { name: /Nina Newbie/ })).toHaveCount(0);
  await waitForEmail(applicant, /Welcome to/);
});

test("a member logs in with the emailed code and sees payment details and their reference", async ({ page }) => {
  await page.context().clearCookies();
  await clearMailbox();
  await page.goto("/login");
  await page.getByLabel("Email address").fill(applicant);
  await page.getByRole("button", { name: "Send login link" }).click();
  const html = await waitForEmail(applicant, /login link/i);
  const code = /letter-spacing:4px">(\d{6,10})</.exec(html)?.[1];
  expect(code).toBeTruthy();
  await page.getByLabel(/Or enter the code/).fill(code!);
  await page.getByRole("button", { name: "Log in with code" }).click();
  await expect(page).toHaveURL(/\/home$/);

  await page.goto("/membership");
  await expect(page.getByText(/MEM-\d+-\d{4}/).first()).toBeVisible();
  await expect(page.getByText("123 456 78 90")).toBeVisible();
  await page.getByRole("button", { name: "I've paid" }).click();
  await expect(page.getByText("You've reported this as paid")).toBeVisible();
});

test("an admin confirms reported payments", async ({ page }) => {
  autoConfirm(page);
  await devLogin(page, "admin@example.test");
  await page.goto("/admin/members");
  await page.getByRole("button", { name: "Confirm all reported" }).click();
  await expect(page.getByRole("button", { name: "Confirm all reported" })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Nina Newbie/ })).toContainText("Paid");
});

test("RSVP respects capacity", async ({ page }) => {
  // The workshop has 3 places and 2 are taken in the seed.
  await devLogin(page, "robin@example.test");
  await page.goto("/events");
  await page.getByText("Bread-baking workshop").click();
  await page.getByRole("button", { name: "I'm going" }).click();
  await expect(page.getByRole("button", { name: "Cancel my place" })).toBeVisible();
  await expect(page.getByText("Pay for this event")).toBeVisible();

  await devLogin(page, "admin@example.test");
  await page.goto("/events");
  await page.getByText("Bread-baking workshop").click();
  await expect(page.getByText("This event is full.")).toBeVisible();
});

test("admin creates an event; members see it", async ({ page }) => {
  await devLogin(page, "admin@example.test");
  await page.goto("/admin/events/new");
  await page.getByLabel("Title").fill("E2E board game night");
  await page.getByLabel("Starts").fill("2030-05-01T19:00");
  await page.getByLabel("Location").fill("The café");
  await page.getByLabel(/Published/).check();
  await page.getByRole("button", { name: "Create event" }).click();
  await expect(page.getByText("Saved and published")).toBeVisible();

  await devLogin(page, "maja@example.test");
  await page.goto("/events");
  await expect(page.getByText("E2E board game night")).toBeVisible();
  await waitForEmail("maja@example.test", /New event: E2E board game night/);
});

test("members comment on announcements", async ({ page }) => {
  await devLogin(page, "sam@example.test");
  await page.goto("/announcements");
  await page.getByText("Welcome to our new community platform!").click();
  await page.getByPlaceholder("Write a comment…").fill("Hello from the e2e test");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByText("Hello from the e2e test")).toBeVisible();
});

test("privacy policy: public, editable, and members are asked to read updates", async ({ page }) => {
  autoConfirm(page);
  await page.context().clearCookies();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { name: "Privacy policy" })).toBeVisible();

  await devLogin(page, "admin@example.test");
  await page.goto("/admin/settings/privacy");
  await page.locator('textarea[name="body_en"]').fill("## Our policy\n\nWe keep things simple at {{community}}.");
  await page.getByRole("button", { name: "Publish new version" }).click();
  await expect(page.getByText(/Version \d+ published/)).toBeVisible();

  await devLogin(page, "maja@example.test");
  await expect(page.getByText("We have updated our privacy policy.")).toBeVisible();
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByText("We have updated our privacy policy.")).toHaveCount(0);
  await page.goto("/privacy");
  await expect(page.getByText("We keep things simple at My Community.")).toBeVisible();
});

test("admin changes colors and the theme updates", async ({ page }) => {
  await devLogin(page, "admin@example.test");
  await page.goto("/admin/settings");
  await page.locator('input[name="primary_color"]').fill("#0f766e");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Saved.").first()).toBeVisible();
  await page.reload();
  expect(await page.locator("head style").first().innerHTML()).toContain("--brand-primary:#0f766e");
});

test("switching language to Swedish", async ({ page }) => {
  await devLogin(page, "maja@example.test");
  await page.getByLabel("Language").selectOption("sv");
  await expect(page.getByRole("link", { name: "Evenemang" }).first()).toBeVisible();
});

test("members cannot reach admin pages", async ({ page }) => {
  await devLogin(page, "maja@example.test");
  await page.goto("/admin/members");
  await expect(page).toHaveURL(/\/home$/);
});

test("setup check, logo upload, exports and calendar file", async ({ page }) => {
  await devLogin(page, "admin@example.test");

  await page.goto("/admin/setup");
  await expect(page.getByText("Environment variables")).toBeVisible();
  await expect(page.getByText(/schema v1 \/ expected v1/)).toBeVisible();

  // 1×1 PNG
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
    "base64",
  );
  await page.goto("/admin/settings");
  await page.locator('input[name="logo"]').setInputFiles({ name: "logo.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Saved.").first()).toBeVisible();
  await page.goto("/");
  await page.goto("/admin/settings");
  const logoSrc = await page
    .locator('img[src*="/storage/v1/object/public/branding/logo/"]')
    .first()
    .getAttribute("src");
  expect(logoSrc).toBeTruthy();
  expect((await page.request.get(logoSrc!)).status()).toBe(200);

  const csv = await page.request.get("/admin/members/export");
  expect(csv.headers()["content-type"]).toContain("text/csv");
  expect(await csv.text()).toContain("maja@example.test");

  const ics = await page.request.get("/events/00000000-0000-4000-9000-000000000001/ics");
  expect(await ics.text()).toContain("SUMMARY:Summer picnic");
});

test("members export their data and can delete their account", async ({ page }) => {
  autoConfirm(page);
  await devLogin(page, "robin@example.test");
  const data = await page.request.get("/profile/export");
  expect((await data.json()).profile.email).toBe("robin@example.test");

  await page.goto("/profile");
  await page.getByLabel(/Type your email address/).fill("robin@example.test");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await page.waitForURL((url) => url.pathname === "/");
  await page.goto("/dev/login");
  await expect(page.getByText("robin@example.test")).toHaveCount(0);
});

test("the last admin cannot delete their own account", async ({ page }) => {
  autoConfirm(page);
  await devLogin(page, "admin@example.test");
  await page.goto("/profile");
  await page.getByLabel(/Type your email address/).fill("admin@example.test");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page.getByText("You're the only admin")).toBeVisible();
});
