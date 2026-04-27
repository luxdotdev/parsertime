import { describe, expect, it } from "vitest";
import { renderScrimRequestMessage } from "@/lib/matchmaker/messages";

describe("renderScrimRequestMessage", () => {
  it("renders the canned template with positive delta", () => {
    const m = renderScrimRequestMessage({
      fromTeamName: "Sea Otters",
      fromBracketLabel: "Mid Masters",
      fromTsr: 3320,
      toTsr: 3280,
    });
    expect(m).toBe(
      "Sea Otters (Mid Masters · TSR 3320) is looking for a scrim. They're +40 TSR from your roster."
    );
  });

  it("renders the canned template with negative delta", () => {
    const m = renderScrimRequestMessage({
      fromTeamName: "Test Team",
      fromBracketLabel: "Low Expert",
      fromTsr: 2900,
      toTsr: 3050,
    });
    expect(m).toBe(
      "Test Team (Low Expert · TSR 2900) is looking for a scrim. They're -150 TSR from your roster."
    );
  });

  it("renders zero delta with explicit ±0", () => {
    const m = renderScrimRequestMessage({
      fromTeamName: "Even",
      fromBracketLabel: "OWCS",
      fromTsr: 4000,
      toTsr: 4000,
    });
    expect(m).toBe(
      "Even (OWCS · TSR 4000) is looking for a scrim. They're ±0 TSR from your roster."
    );
  });
});
