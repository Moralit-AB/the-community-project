import { describe, expect, it } from "vitest";
import en from "@/messages/en.json";
import sv from "@/messages/sv.json";

function keys(obj: object, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object" ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe("translations", () => {
  it("every language has exactly the same keys as English", () => {
    const enKeys = keys(en).sort();
    for (const [name, messages] of Object.entries({ sv })) {
      const other = keys(messages).sort();
      expect({
        name,
        missing: enKeys.filter((k) => !other.includes(k)),
        extra: other.filter((k) => !enKeys.includes(k)),
      }).toEqual({
        name,
        missing: [],
        extra: [],
      });
    }
  });
});
