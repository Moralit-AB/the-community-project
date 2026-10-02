"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

export function CopyButton({ value }: { value: string }) {
  const t = useTranslations("Common");
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-border px-2 py-0.5 text-xs text-muted hover:text-foreground"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // Clipboard not available (e.g. insecure context): ignore.
        }
      }}
    >
      {copied ? t("copied") : t("copy")}
    </button>
  );
}
