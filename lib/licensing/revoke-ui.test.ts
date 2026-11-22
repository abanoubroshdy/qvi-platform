import { describe, expect, it } from "vitest";
import { patchLicenseListRevoked, patchUserLicenseDeviceRevoked } from "@/lib/licensing/revoke-ui";

describe("revoke-ui", () => {
  it("marks a license revoked in the admin list", () => {
    const rows = [
      { id: "a", status: "active", activeDevices: 2 },
      { id: "b", status: "active", activeDevices: 1 },
    ];
    expect(patchLicenseListRevoked(rows, "a")).toEqual([
      { id: "a", status: "revoked", activeDevices: 0 },
      { id: "b", status: "active", activeDevices: 1 },
    ]);
  });

  it("marks a user device revoked without dropping the row", () => {
    const at = "2026-01-01T00:00:00.000Z";
    const rows = [
      {
        devices: [
          { id: "d1", revoked_at: null },
          { id: "d2", revoked_at: null },
        ],
      },
    ];
    const updated = patchUserLicenseDeviceRevoked(rows, "d1", at);
    expect(updated[0]?.devices[0]?.revoked_at).toBe(at);
    expect(updated[0]?.devices[1]?.revoked_at).toBeNull();
  });
});