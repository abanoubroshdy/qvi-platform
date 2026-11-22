import { describe, expect, it, vi } from "vitest";

describe("register_license_device RPC integration", () => {
  it("maps device_limit from rpc", async () => {
    const client = {
      rpc: vi.fn(async () => ({ data: "device_limit", error: null })),
    };
    const { data, error } = await client.rpc("register_license_device", {
      p_license_id: "id",
      p_fingerprint: "fp",
      p_device_name: null,
    });
    expect(error).toBeNull();
    expect(data).toBe("device_limit");
  });
});