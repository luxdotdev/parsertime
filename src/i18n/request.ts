/* eslint-disable */
import { getUserLocale } from "@/lib/locale";
import { getRequestConfig } from "next-intl/server";

type Messages = Record<string, unknown>;

function mergeMessages(fallback: Messages, messages: Messages): Messages {
  const merged: Messages = { ...fallback };

  for (const [key, value] of Object.entries(messages)) {
    const fallbackValue = fallback[key];

    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      fallbackValue &&
      typeof fallbackValue === "object" &&
      !Array.isArray(fallbackValue)
    ) {
      merged[key] = mergeMessages(fallbackValue as Messages, value as Messages);
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  const defaultMessages = (await import("../../messages/en.json")).default;
  const localeMessages =
    locale === "en"
      ? defaultMessages
      : (await import(`../../messages/${locale}.json`)).default;

  return {
    locale,
    messages:
      locale === "en"
        ? defaultMessages
        : mergeMessages(defaultMessages, localeMessages),
  };
});
