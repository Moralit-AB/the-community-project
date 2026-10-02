import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { acceptPrivacyPolicy } from "@/lib/actions/privacy";
import { getPrivacyPolicy } from "@/lib/settings";
import { SubmitButton } from "./submit-button";

/** Shown to members until they acknowledge the latest version of the privacy policy. */
export async function PrivacyUpdateBanner({ acceptedVersion }: { acceptedVersion: number | null }) {
  const policy = await getPrivacyPolicy(await getLocale());
  if (!policy || (acceptedVersion ?? 0) >= policy.version) return null;
  const t = await getTranslations("Privacy");
  return (
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3 text-sm">
      <p>
        {acceptedVersion ? t("bannerUpdated") : t("bannerNew")}{" "}
        <Link href="/privacy" className="font-medium underline">
          {t("readPolicy")}
        </Link>
      </p>
      <form action={acceptPrivacyPolicy.bind(null, policy.version)}>
        <SubmitButton size="sm">{t("acknowledge")}</SubmitButton>
      </form>
    </div>
  );
}
