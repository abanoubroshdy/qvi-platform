import { describe, expect, it } from "vitest";
import { licenseHasCloudUpdates } from "@/lib/licensing/token-access";

describe("licenseHasCloudUpdates", () => {
  it("matches CloudUpdates case-insensitively", () => {
    expect(licenseHasCloudUpdates(["CloudUpdates"])).toBe(true);
    expect(licenseHasCloudUpdates(["cloudupdates"])).toBe(true);
    expect(licenseHasCloudUpdates(["ProExport"])).toBe(false);
  });
});