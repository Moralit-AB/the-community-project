"use client";

import { useState } from "react";
import { Markdown } from "./markdown";
import { cn } from "./ui";

/** Textarea with a Write / Preview toggle. Placeholders like {{community}} are shown filled in. */
export function MarkdownEditor({
  name,
  defaultValue,
  labels,
  placeholders = {},
  rows = 18,
}: {
  name: string;
  defaultValue: string;
  labels: { write: string; preview: string };
  placeholders?: Record<string, string>;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [preview, setPreview] = useState(false);
  const filled = Object.entries(placeholders).reduce((s, [k, v]) => s.replaceAll(`{{${k}}}`, v), value);
  return (
    <div className="rounded-lg border border-border">
      <div className="flex gap-1 border-b border-border p-1">
        {[false, true].map((p) => (
          <button
            key={String(p)}
            type="button"
            onClick={() => setPreview(p)}
            className={cn("rounded px-3 py-1 text-sm", preview === p ? "bg-background font-medium" : "text-muted")}
          >
            {p ? labels.preview : labels.write}
          </button>
        ))}
      </div>
      <textarea
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={rows}
        className={cn("w-full resize-y bg-surface p-3 font-mono text-sm focus:outline-none", preview && "hidden")}
      />
      {preview && (
        <div className="max-h-[32rem] overflow-y-auto p-4">
          <Markdown>{filled}</Markdown>
        </div>
      )}
    </div>
  );
}
