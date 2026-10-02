"use client";

import { useLocale } from "next-intl";
import { useTransition } from "react";
import { setLocale } from "@/lib/actions/locale";
import { LANGUAGE_NAMES } from "@/lib/config-schema";

export function LocaleSwitcher({ locales }: { locales: string[] }) {
  const current = useLocale();
  const [pending, startTransition] = useTransition();
  if (locales.length < 2) return null;
  return (
    <select
      aria-label="Language"
      value={current}
      disabled={pending}
      onChange={(e) => startTransition(() => setLocale(e.target.value))}
      className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-muted"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {LANGUAGE_NAMES[l as keyof typeof LANGUAGE_NAMES] ?? l}
        </option>
      ))}
    </select>
  );
}
