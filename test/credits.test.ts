import { describe, expect, test } from "vitest";
import { shouldTriggerAutoRefill } from "@/lib/chat-pricing";

describe("shouldTriggerAutoRefill", () => {
  const base = {
    enabled: true,
    hasPaymentMethod: true,
    beforeCents: 300,
    afterCents: 150,
    thresholdCents: 200,
  };

  test("fires exactly when the charge crosses the threshold downward", () => {
    expect(shouldTriggerAutoRefill(base)).toBe(true);
  });

  test("does not fire if the balance was already below threshold before the charge", () => {
    expect(
      shouldTriggerAutoRefill({ ...base, beforeCents: 150, afterCents: 50 })
    ).toBe(false);
  });

  test("does not fire if the post-charge balance is still above threshold", () => {
    expect(
      shouldTriggerAutoRefill({ ...base, beforeCents: 500, afterCents: 400 })
    ).toBe(false);
  });

  test("does not fire when auto-refill is disabled", () => {
    expect(shouldTriggerAutoRefill({ ...base, enabled: false })).toBe(false);
  });

  test("does not fire when no payment method is saved", () => {
    expect(shouldTriggerAutoRefill({ ...base, hasPaymentMethod: false })).toBe(
      false
    );
  });

  test("fires when the charge drops balance exactly to the threshold boundary", () => {
    expect(
      shouldTriggerAutoRefill({
        ...base,
        beforeCents: 250,
        afterCents: 199,
        thresholdCents: 200,
      })
    ).toBe(true);
  });
});
