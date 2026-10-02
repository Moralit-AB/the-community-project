"use client";

import { useState } from "react";
import { contrastRatio, HEX_COLOR, readableTextColor } from "@/lib/theme";

/** A color picker with a live preview button and a readability check. */
export function ColorField({
  name,
  label,
  defaultValue,
  previewLabel,
  lowContrastLabel,
  checkContrast = true,
}: {
  name: string;
  label: string;
  defaultValue: string;
  previewLabel: string;
  lowContrastLabel: string;
  /** Warn when the color is too light to read as text on white (for colors used as text). */
  checkContrast?: boolean;
}) {
  const [value, setValue] = useState(defaultValue);
  const valid = HEX_COLOR.test(value);
  const onWhite = valid ? contrastRatio(value, "#ffffff") : 21;
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="block text-sm font-medium">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          type="color"
          aria-label={label}
          value={valid ? value : "#000000"}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded border border-border bg-surface"
        />
        <input
          id={name}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          pattern="#[0-9a-fA-F]{6}"
          required
          className="w-28 rounded-lg border border-border bg-surface px-3 py-2 font-mono text-sm"
        />
        {valid && (
          <span
            className="rounded-lg px-3 py-2 text-sm font-medium"
            style={{ background: value, color: readableTextColor(value) }}
          >
            {previewLabel}
          </span>
        )}
      </div>
      {checkContrast && valid && onWhite < 3 && (
        <p className="text-xs text-amber-700 dark:text-amber-300">{lowContrastLabel}</p>
      )}
    </div>
  );
}
