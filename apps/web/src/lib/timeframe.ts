export type Timeframe =
  | "one-week"
  | "two-weeks"
  | "one-month"
  | "three-months"
  | "six-months"
  | "one-year"
  | "all-time"
  | "custom";

const VALID_TIMEFRAMES = new Set<string>([
  "one-week",
  "two-weeks",
  "one-month",
  "three-months",
  "six-months",
  "one-year",
  "all-time",
  "custom",
]);

export function isValidTimeframe(value: string | null): value is Timeframe {
  return value !== null && VALID_TIMEFRAMES.has(value);
}
