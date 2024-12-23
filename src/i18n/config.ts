export type Locale = (typeof locales)[number]["code"];

export const locales = [
  { code: "en", name: "English" },
  { code: "zh", name: "中文" },
] as const;
export const defaultLocale: Locale = "en";
