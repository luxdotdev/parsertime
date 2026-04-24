import { describe, expect, test } from "vitest";
import {
  CHAT_MODEL_PRICING,
  MIN_BALANCE_TO_CHAT_CENTS,
  TOPUP_MIN_CENTS,
  autoRefillIdempotencyKey,
  calculateChargeCents,
} from "@/lib/chat-pricing";

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

describe("chat pricing safety constants", () => {
  test("minimum chat balance covers at least one maximum-expected request", () => {
    // A reasonable single request with tool loops consumes up to ~20k in / 5k
    // out tokens. The preflight buffer should cover that ceiling so a single
    // over-estimate cannot drive the balance negative.
    const maxExpectedRequestCents = calculateChargeCents({
      inputTokens: 20_000,
      outputTokens: 5_000,
    });
    expect(MIN_BALANCE_TO_CHAT_CENTS).toBeGreaterThanOrEqual(
      maxExpectedRequestCents
    );
  });

  test("top-up minimum is higher than the chat preflight floor", () => {
    expect(TOPUP_MIN_CENTS).toBeGreaterThan(MIN_BALANCE_TO_CHAT_CENTS);
  });
});

describe("autoRefillIdempotencyKey", () => {
  test("two calls within the same minute produce the same key", () => {
    const baseMs = 1_700_000_000_000;
    const keyA = autoRefillIdempotencyKey("user_123", baseMs);
    const keyB = autoRefillIdempotencyKey("user_123", baseMs + 30_000);
    expect(keyA).toBe(keyB);
  });

  test("calls in different minutes produce different keys", () => {
    const baseMs = 1_700_000_000_000;
    const keyA = autoRefillIdempotencyKey("user_123", baseMs);
    const keyB = autoRefillIdempotencyKey("user_123", baseMs + 60_001);
    expect(keyA).not.toBe(keyB);
  });

  test("different users produce different keys at the same moment", () => {
    const nowMs = 1_700_000_000_000;
    const keyA = autoRefillIdempotencyKey("user_a", nowMs);
    const keyB = autoRefillIdempotencyKey("user_b", nowMs);
    expect(keyA).not.toBe(keyB);
  });
});
