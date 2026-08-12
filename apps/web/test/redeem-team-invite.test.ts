import { redeemTeamInvite } from "@/lib/redeem-team-invite";
import { afterEach, describe, expect, it, vi } from "vitest";

describe("redeemTeamInvite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("redeems an encoded invite token with POST", async () => {
    const request = vi.fn().mockResolvedValue(new Response("OK"));
    vi.stubGlobal("fetch", request);

    await redeemTeamInvite("invite/token?with=special&characters");

    expect(request).toHaveBeenCalledOnce();
    expect(request).toHaveBeenCalledWith(
      "/api/team/join-team?token=invite%2Ftoken%3Fwith%3Dspecial%26characters",
      { method: "POST" }
    );
  });
});
