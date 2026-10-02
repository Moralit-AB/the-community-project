import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("Common");
  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t("notFound")}</h1>
      <Link href="/" className="mt-4 inline-block text-primary underline">
        {t("goHome")}
      </Link>
    </main>
  );
}
