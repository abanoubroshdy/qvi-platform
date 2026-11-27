import { describe, expect, it } from "vitest";
import { sanitizeReleaseRow, sanitizeReleaseRows } from "./release-public";

describe("sanitizeReleaseRow", () => {
  it("removes storage_path from release records", () => {
    const row = {
      id: "1",
      version: "1.0",
      storage_path: "secret/key",
      file_size: 2048,
      mandatory: true,
      min_os_version: "10.0.19041",
    };
    expect(sanitizeReleaseRow(row)).toEqual({
      id: "1",
      version: "1.0",
      fileSize: 2048,
      mandatory: true,
      minOsVersion: "10.0.19041",
    });
  });

  it("sanitizes arrays", () => {
    expect(sanitizeReleaseRows([{ id: "a", storage_path: "x" }])).toEqual([
      { id: "a", fileSize: undefined, mandatory: false, minOsVersion: undefined },
    ]);
  });
});