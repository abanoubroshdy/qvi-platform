import { describe, expect, it } from "vitest";
import { isNewerVersion } from "@/lib/licensing/version";

describe("isNewerVersion", () => {
  it("compares dotted versions", () => {
    expect(isNewerVersion("1.0.1", "1.0.0")).toBe(true);
    expect(isNewerVersion("1.0.0", "1.0.1")).toBe(false);
    expect(isNewerVersion("2.0", "1.9.9")).toBe(true);
  });
});