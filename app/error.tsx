"use client";

import { useTranslations } from "next-intl";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  const t = useTranslations("Common");
  return (
    <main className="mx-auto max-w-md flex-1 px-4 py-24 text-center">
      <h1 className="text-2xl font-semibold">{t("errorTitle")}</h1>
      <p className="mt-2 text-muted">{t("errorBody")}</p>
      <button onClick={reset} className="mt-4 text-primary underline">
        {t("tryAgain")}
      </button>
    </main>
  );
}
