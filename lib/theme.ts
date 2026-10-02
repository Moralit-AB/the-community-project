// Turns the two brand colors into CSS variables, choosing readable text colors automatically.

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex: string): number {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/** WCAG contrast ratio between two colors (1–21). */
export function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Black or white, whichever reads better on `background`. */
export function readableTextColor(background: string): "#000000" | "#ffffff" {
  return contrastRatio(background, "#ffffff") >= contrastRatio(background, "#000000") ? "#ffffff" : "#000000";
}

export function safeColor(value: string | null | undefined, fallback: string): string {
  return value && HEX_COLOR.test(value) ? value.toLowerCase() : fallback;
}

/** CSS injected into <head>. Only validated hex colors reach this string. */
export function themeCss(primary: string, accent: string): string {
  return `:root{--brand-primary:${primary};--brand-primary-fg:${readableTextColor(primary)};--brand-accent:${accent};--brand-accent-fg:${readableTextColor(accent)};}`;
}
