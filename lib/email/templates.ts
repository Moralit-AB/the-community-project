import { config } from "@/lib/config";
import { publicEnv } from "@/lib/env-public";

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export type EmailContent = {
  heading: string;
  /** Plain-text paragraphs. They are escaped, so user content is safe here. */
  paragraphs: string[];
  /** An optional quoted block, e.g. an applicant's message. */
  quote?: string;
  cta?: { label: string; path: string };
  /** Footer line, e.g. why the recipient got this email. */
  footer: string;
  primaryColor: string;
};

/** Renders a simple, email-client-friendly HTML email plus a plain-text version. */
export function renderEmail(c: EmailContent, privacyLabel: string): { html: string; text: string } {
  const site = publicEnv.siteUrl;
  const p = (s: string) => `<p style="margin:0 0 16px;line-height:1.55">${escapeHtml(s).replace(/\n/g, "<br>")}</p>`;
  const ctaUrl = c.cta ? `${site}${c.cta.path}` : null;

  const html = `<!doctype html><html><body style="margin:0;background:#f4f4f5">
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
<div style="background:#ffffff;border-radius:12px;padding:28px;border-top:4px solid ${c.primaryColor}">
<p style="margin:0 0 20px;font-weight:600;color:#6b7280">${escapeHtml(config.name)}</p>
<h1 style="margin:0 0 16px;font-size:20px">${escapeHtml(c.heading)}</h1>
${c.paragraphs.map(p).join("\n")}
${c.quote ? `<blockquote style="margin:0 0 16px;padding:8px 14px;border-left:3px solid #d1d5db;color:#374151">${escapeHtml(c.quote).replace(/\n/g, "<br>")}</blockquote>` : ""}
${ctaUrl ? `<p style="margin:24px 0"><a href="${escapeHtml(ctaUrl)}" style="display:inline-block;background:${c.primaryColor};color:#ffffff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(c.cta!.label)}</a></p>` : ""}
</div>
<p style="margin:16px 0 0;font-size:12px;color:#6b7280;line-height:1.5">${escapeHtml(c.footer)}<br>
<a href="${escapeHtml(site)}/profile" style="color:#6b7280">${escapeHtml(site.replace(/^https?:\/\//, ""))}/profile</a> · <a href="${escapeHtml(site)}/privacy" style="color:#6b7280">${escapeHtml(privacyLabel)}</a></p>
</div></body></html>`;

  const text = [
    config.name,
    "",
    c.heading,
    "",
    ...c.paragraphs.flatMap((s) => [s, ""]),
    ...(c.quote ? [`> ${c.quote.replace(/\n/g, "\n> ")}`, ""] : []),
    ...(ctaUrl ? [`${c.cta!.label}: ${ctaUrl}`, ""] : []),
    "--",
    c.footer,
    `${site}/profile · ${site}/privacy`,
  ].join("\n");

  return { html, text };
}
