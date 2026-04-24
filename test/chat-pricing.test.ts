import { describe, expect, test } from "vitest";
import { CHAT_MODEL_PRICING, calculateChargeCents } from "@/lib/chat-pricing";

describe("calculateChargeCents", () => {
  test("rounds up to at least 1 cent for tiny usage", () => {
    expect(calculateChargeCents({ inputTokens: 1, outputTokens: 1 })).toBe(1);
  });

  test("applies the configured markup on top of raw token costs", () => {
    const inputTokens = 1_000_000;
    const outputTokens = 1_000_000;
    const raw =
      CHAT_MODEL_PRICING.inputPerMillionCents +
      CHAT_MODEL_PRICING.outputPerMillionCents;
    const expected = Math.ceil(
      raw * (1 + CHAT_MODEL_PRICING.markupBps / 10_000)
    );
    expect(calculateChargeCents({ inputTokens, outputTokens })).toBe(expected);
  });

  test("charges input and output tokens at different rates", () => {
    const inputOnly = calculateChargeCents({
      inputTokens: 1_000_000,
      outputTokens: 0,
    });
    const outputOnly = calculateChargeCents({
      inputTokens: 0,
      outputTokens: 1_000_000,
    });
    expect(outputOnly).toBeGreaterThan(inputOnly);
  });

  test("rounds fractional cents up, never down", () => {
    expect(
      calculateChargeCents({ inputTokens: 100, outputTokens: 100 })
    ).toBeGreaterThanOrEqual(1);
  });
});
