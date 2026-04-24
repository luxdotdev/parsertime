export const CHAT_MODEL_PRICING = {
  model: "openai/gpt-5.4",
  inputPerMillionCents: 250,
  outputPerMillionCents: 1500,
  markupBps: 1000,
} as const;

export const TOPUP_MIN_CENTS = 500;

export const TOPUP_PRESETS_CENTS = [500, 1000, 2500, 5000] as const;

export const DEFAULT_AUTO_REFILL_THRESHOLD_CENTS = 200;
export const DEFAULT_AUTO_REFILL_AMOUNT_CENTS = 1000;

export type TokenUsage = {
  inputTokens: number;
  outputTokens: number;
};

export function calculateChargeCents({
  inputTokens,
  outputTokens,
}: TokenUsage): number {
  const baseCents =
    (inputTokens * CHAT_MODEL_PRICING.inputPerMillionCents +
      outputTokens * CHAT_MODEL_PRICING.outputPerMillionCents) /
    1_000_000;

  const withMarkup = baseCents * (1 + CHAT_MODEL_PRICING.markupBps / 10_000);

  return Math.max(1, Math.ceil(withMarkup));
}

export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
