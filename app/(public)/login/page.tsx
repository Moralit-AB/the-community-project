import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth";
import { safeNextPath } from "@/lib/post-login";
import { LoginForm } from "@/components/auth-forms";
import { Alert, Card } from "@/components/ui";
import { requestLogin, verifyCode } from "./actions";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getTranslations("Auth"))("loginTitle") };
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  if (await getCurrentUser()) redirect("/home");
  const t = await getTranslations("Auth");
  const params = await searchParams;
  const next = safeNextPath(typeof params.next === "string" ? params.next : null) ?? undefined;

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-2 text-2xl font-semibold">{t("loginTitle")}</h1>
      <p className="mb-6 text-muted">{t("loginIntro")}</p>
      {params.error === "link" && (
        <div className="mb-4">
          <Alert tone="warning">{t("errors.linkExpired")}</Alert>
        </div>
      )}
      <Card>
        <LoginForm requestAction={requestLogin} verifyAction={verifyCode} next={next} />
      </Card>
    </div>
  );
}
