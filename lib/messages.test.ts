import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

const dir = join(__dirname, "..", "messages");
const others = readdirSync(dir).filter((f) => f.endsWith(".json") && f !== "en.json");

describe("translations", () => {
  const enKeys = keys(en).sort();
  it.each(others)("%s has exactly the same keys as en.json", (file) => {
    const other = keys(JSON.parse(readFileSync(join(dir, file), "utf8"))).sort();
    expect({
      missing: enKeys.filter((k) => !other.includes(k)),
      extra: other.filter((k) => !enKeys.includes(k)),
    }).toEqual({
      missing: [],
      extra: [],
    });
  });
});
