const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twenty: 20,
};

export const NUMBER_WORD_TOKEN =
  "zero|one|two|three|four|five|six|seven|eight|nine|ten|twenty";
export const NUMBER_TOKEN = `\\d+(?:\\.\\d+)?|${NUMBER_WORD_TOKEN}`;
export const INTEGER_TOKEN = `\\d{1,3}|${NUMBER_WORD_TOKEN}`;

export function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/(\d)\.(\d)/g, "$1DECIMALPOINT$2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .replace(/DECIMALPOINT/g, ".")
    .trim()
    .toLowerCase()
    .replace(/\bper ten(?: minutes?| mins?)?\b/g, "per 10");
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function includesPhrase(haystack: string, phrase: string): boolean {
  const normalized = normalize(phrase);
  return new RegExp(`(^|\\s)${escapeRegExp(normalized)}(\\s|$)`).test(
    haystack
  );
}

export function titleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function numberFromToken(token: string): number | null {
  const normalized = normalize(token);
  if (/^\d+(?:\.\d+)?$/.test(normalized)) return Number(normalized);
  return NUMBER_WORDS[normalized] ?? null;
}

export function durationSeconds(value: string, unit: string): number | null {
  const amount = numberFromToken(value);
  if (amount == null) return null;
  const normalizedUnit = normalize(unit);
  let scale = 1;
  if (
    normalizedUnit.startsWith("hour") ||
    normalizedUnit.startsWith("hr") ||
    normalizedUnit.startsWith("h")
  ) {
    scale = 3600;
  } else if (normalizedUnit.startsWith("min") || normalizedUnit === "m") {
    scale = 60;
  }
  return Math.round(amount * scale);
}
