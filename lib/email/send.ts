import "server-only";
import nodemailer, { type Transporter } from "nodemailer";
import { serverEnv } from "@/lib/env";

let transporter: Transporter | null = null;

function getTransport(): Transporter | null {
  const smtp = serverEnv.smtp;
  if (!smtp) return null;
  transporter ??= nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.port === 465,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    connectionTimeout: 10_000,
  });
  return transporter;
}

export type Email = { to: string; subject: string; html: string; text: string };

/** Sends one email. Returns false (and logs why, without personal data) instead of throwing. */
export async function sendEmail(email: Email): Promise<boolean> {
  const transport = getTransport();
  if (!transport) {
    console.warn(`[email] SMTP is not configured; skipped "${email.subject}". See SMTP_* in .env.example.`);
    return false;
  }
  try {
    await transport.sendMail({ from: serverEnv.smtp!.from, ...email });
    return true;
  } catch (err) {
    console.error(`[email] Sending "${email.subject}" failed: ${(err as Error).message}`);
    return false;
  }
}

/** Checks the SMTP connection and login, for the setup page. */
export async function verifySmtp(): Promise<{ ok: boolean; error?: string }> {
  const transport = getTransport();
  if (!transport) return { ok: false, error: "SMTP_HOST / SMTP_FROM not set" };
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}
