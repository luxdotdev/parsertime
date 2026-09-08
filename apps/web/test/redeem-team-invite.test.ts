import { maskEmail, redeemTeamInvite } from "@/lib/redeem-team-invite";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("redeemTeamInvite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redeems an encoded invite token with POST", async () => {
    const request = vi.fn().mockResolvedValue(new Response("OK"));
    vi.stubGlobal("fetch", request);

    const result = await redeemTeamInvite(
      "invite/token?with=special&characters"
    );

    expect(result).toEqual({ ok: true });
    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "/api/team/join-team?token=invite%2Ftoken%3Fwith%3Dspecial%26characters",
      { method: "POST" }
    );
  });

  it("surfaces an email mismatch with both addresses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json(
          {
            reason: "email_mismatch",
            invitedEmail: "h•••@gmail.com",
            currentEmail: "me@example.com",
          },
          { status: 403 }
        )
      )
    );

    await expect(redeemTeamInvite("t")).resolves.toEqual({
      ok: false,
      reason: "email_mismatch",
      invitedEmail: "h•••@gmail.com",
      currentEmail: "me@example.com",
    });
  });

  it("maps 401 to unauthorized without reading a body", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 }))
    );

    await expect(redeemTeamInvite("t")).resolves.toEqual({
      ok: false,
      reason: "unauthorized",
    });
  });

  it("falls back to a generic error for unknown bodies", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("<html>Bad Gateway</html>", { status: 502 })
        )
    );

    await expect(redeemTeamInvite("t")).resolves.toEqual({
      ok: false,
      reason: "error",
    });
  });
});

describe("maskEmail", () => {
  it("keeps the first character and the domain", () => {
    expect(maskEmail("humjavi06@gmail.com")).toBe("h•••@gmail.com");
  });

  it("does not leak anything for malformed input", () => {
    expect(maskEmail("not-an-email")).toBe("•••");
    expect(maskEmail("@gmail.com")).toBe("•••");
  });
});
