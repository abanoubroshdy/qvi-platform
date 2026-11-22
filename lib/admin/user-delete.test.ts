import { describe, expect, it } from "vitest";
import { assessUserDeletion, DELETE_CONFIRM_KEYWORD } from "./user-delete";

describe("assessUserDeletion", () => {
  const env = {
    ADMIN_EMAILS: "ops@getqvi.com",
    LICENSE_ADMIN_EMAILS: "license@getqvi.com",
  };

  it("rejects self-delete", () => {
    expect(
      assessUserDeletion({
        actorUserId: "u1",
        targetUserId: "u1",
        targetEmail: "a@x.com",
        env,
      }),
    ).toEqual({ ok: false, reason: "self" });
  });

  it("rejects protected admin emails from either list", () => {
    expect(
      assessUserDeletion({
        actorUserId: "actor",
        targetUserId: "u1",
        targetEmail: "license@getqvi.com",
        env,
      }),
    ).toEqual({ ok: false, reason: "protected_admin" });
    expect(
      assessUserDeletion({
        actorUserId: "actor",
        targetUserId: "u2",
        targetEmail: "Ops@GetQVI.com",
        env,
      }),
    ).toEqual({ ok: false, reason: "protected_admin" });
  });

  it("allows ordinary accounts", () => {
    expect(
      assessUserDeletion({
        actorUserId: "actor",
        targetUserId: "u3",
        targetEmail: "fake@test.com",
        env,
      }),
    ).toEqual({ ok: true });
  });
});

describe("DELETE_CONFIRM_KEYWORD", () => {
  it("is DELETE", () => {
    expect(DELETE_CONFIRM_KEYWORD).toBe("DELETE");
  });
});