import { describe, expect, it } from "vitest";
import { escapeCsvCell, rowsToCsv } from "@/lib/admin/csv";

describe("escapeCsvCell", () => {
  it("quotes values with commas and escapes quotes", () => {
    expect(escapeCsvCell(`He said "hi", friend`)).toBe(`"He said ""hi"", friend"`);
  });
});

describe("rowsToCsv", () => {
  it("builds a header row and aligned values", () => {
    const csv = rowsToCsv(["email", "status"], [
      { email: "ada@studio.com", status: "new" },
      { email: "bot@evil.com", status: "handled" },
    ]);
    expect(csv).toBe("email,status\nada@studio.com,new\nbot@evil.com,handled\n");
  });
});