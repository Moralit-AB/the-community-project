import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations } from "next-intl/server";
import { config, hasMembershipFee } from "@/lib/config";
import { verifySmtp } from "@/lib/email/send";
import { envStatus, serverEnv } from "@/lib/env";
import { publicEnv } from "@/lib/env-public";
import { SCHEMA_VERSION } from "@/lib/schema-version";
import { BRANDING_BUCKET } from "@/lib/settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge, Card, PageHeader } from "@/components/ui";

type Check = { key: string; status: "ok" | "warn" | "fail"; detail?: string };

async function runChecks(host: string | null): Promise<Check[]> {
  const checks: Check[] = [];
  const env = envStatus();
  const missing = env.filter((e) => e.required && !e.set).map((e) => e.name);
  checks.push({ key: "env", status: missing.length ? "fail" : "ok", detail: missing.join(", ") || undefined });

  let admin: ReturnType<typeof createAdminClient> | null = null;
  try {
    admin = createAdminClient();
  } catch {
    checks.push({ key: "database", status: "fail", detail: "SUPABASE_SECRET_KEY" });
  }

  if (admin) {
    const { data: meta, error } = await admin
      .from("app_meta")
      .select("value")
      .eq("key", "schema_version")
      .maybeSingle();
    if (error) checks.push({ key: "database", status: "fail", detail: error.message });
    else {
      const version = Number(meta?.value ?? 0);
      checks.push({
        key: "database",
        status: version === SCHEMA_VERSION ? "ok" : "fail",
        detail: `schema v${version || "?"} / expected v${SCHEMA_VERSION}`,
      });
    }

    const { data: bucket } = await admin.storage.getBucket(BRANDING_BUCKET);
    checks.push({ key: "storage", status: bucket ? "ok" : "fail" });

    const { count: admins } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin")
      .eq("status", "approved");
    checks.push({ key: "admins", status: (admins ?? 0) > 0 ? "ok" : "fail", detail: String(admins ?? 0) });

    const { data: settings } = await admin.from("community_settings").select("logo_path").eq("id", 1).maybeSingle();
    checks.push({ key: "logo", status: settings?.logo_path ? "ok" : "warn" });

    if (hasMembershipFee) {
      const { data: pd } = await admin.from("payment_details").select("*").eq("id", 1).maybeSingle();
      const any = pd && (pd.account_number || pd.iban || pd.swish_number || pd.qr_path || pd.instructions);
      checks.push({ key: "payment", status: any ? "ok" : "fail" });
    }

    const { data: policy } = await admin
      .from("privacy_policies")
      .select("is_default")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    checks.push({ key: "privacy", status: policy && !policy.is_default ? "ok" : "warn" });
  }

  const smtp = await verifySmtp();
  checks.push({ key: "smtp", status: smtp.ok ? "ok" : "fail", detail: smtp.error });

  const siteHost = (() => {
    try {
      return new URL(publicEnv.siteUrl).host;
    } catch {
      return "";
    }
  })();
  checks.push({
    key: "siteUrl",
    status: host && siteHost === host ? "ok" : "warn",
    detail: `NEXT_PUBLIC_SITE_URL = ${publicEnv.siteUrl}`,
  });

  checks.push({ key: "cron", status: serverEnv.cronSecret ? "ok" : "warn" });

  const configDefaults = config.name === "My Community" || config.contactEmail.endsWith("@example.org");
  checks.push({ key: "config", status: configDefaults ? "warn" : "ok" });

  return checks;
}

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Setup"))("title") };
}

export default async function SetupPage() {
  const t = await getTranslations("Setup");
  const checks = await runChecks((await headers()).get("host"));
  const failing = checks.filter((c) => c.status === "fail").length;

  return (
    <div className="max-w-3xl space-y-6">
      <PageHeader title={t("title")} description={t("intro")} />
      <Card className={failing ? "border-red-300" : "border-green-300"}>
        <p className="font-medium">{failing ? t("summaryFail", { count: failing }) : t("summaryOk")}</p>
      </Card>
      <Card className="divide-y divide-border p-0">
        {checks.map((c) => (
          <div key={c.key} className="flex gap-4 px-5 py-4">
            <div className="pt-0.5">
              <Badge tone={c.status === "ok" ? "success" : c.status === "warn" ? "warning" : "danger"}>
                {t(`status.${c.status}`)}
              </Badge>
            </div>
            <div className="min-w-0">
              <p className="font-medium">{t(`checks.${c.key}.title` as "checks.env.title")}</p>
              {c.status !== "ok" && (
                <p className="mt-1 text-sm text-muted">{t(`checks.${c.key}.fix` as "checks.env.fix")}</p>
              )}
              {c.detail && <p className="mt-1 break-all font-mono text-xs text-muted">{c.detail}</p>}
            </div>
          </div>
        ))}
      </Card>
      <p className="text-sm text-muted">{t("manual")}</p>
    </div>
  );
}
