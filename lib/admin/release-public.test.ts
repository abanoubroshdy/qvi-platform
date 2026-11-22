import { describe, expect, it } from "vitest";
import { sanitizeReleaseRow, sanitizeReleaseRows } from "./release-public";

describe("sanitizeReleaseRow", () => {
  it("removes storage_path from release records", () => {
    const row = {
      id: "1",
      version: "1.0",
      storage_path: "secret/key",
    };
    expect(sanitizeReleaseRow(row)).toEqual({ id: "1", version: "1.0" });
  });

  it("sanitizes arrays", () => {
    expect(sanitizeReleaseRows([{ id: "a", storage_path: "x" }])).toEqual([{ id: "a" }]);
  });
});