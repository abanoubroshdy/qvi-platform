import { describe, expect, it } from "vitest";

const SHA256_RE = /^[a-f0-9]{64}$/i;

function canCompleteSubmission(input: {
  principalUserId: string;
  submissionUserId: string;
  status: string;
  declaredSize: number | null;
  bodySize: number;
  sha256: string;
}): { ok: boolean; errorCode?: string } {
  if (input.submissionUserId !== input.principalUserId) {
    return { ok: false, errorCode: "forbidden" };
  }
  if (input.status !== "pending") {
    return { ok: false, errorCode: "invalid_state" };
  }
  if (!SHA256_RE.test(input.sha256)) {
    return { ok: false, errorCode: "invalid_request" };
  }
  if (typeof input.declaredSize === "number" && input.bodySize !== input.declaredSize) {
    return { ok: false, errorCode: "size_mismatch" };
  }
  return { ok: true };
}

describe("complete ownership and validation guards", () => {
  it("rejects wrong user", () => {
    expect(
      canCompleteSubmission({
        principalUserId: "a",
        submissionUserId: "b",
        status: "pending",
        declaredSize: 10,
        bodySize: 10,
        sha256: "a".repeat(64),
      }),
    ).toEqual({ ok: false, errorCode: "forbidden" });
  });

  it("rejects non-pending", () => {
    expect(
      canCompleteSubmission({
        principalUserId: "a",
        submissionUserId: "a",
        status: "completed",
        declaredSize: 10,
        bodySize: 10,
        sha256: "a".repeat(64),
      }),
    ).toEqual({ ok: false, errorCode: "invalid_state" });
  });

  it("rejects size mismatch", () => {
    expect(
      canCompleteSubmission({
        principalUserId: "a",
        submissionUserId: "a",
        status: "pending",
        declaredSize: 10,
        bodySize: 11,
        sha256: "a".repeat(64),
      }),
    ).toEqual({ ok: false, errorCode: "size_mismatch" });
  });
});