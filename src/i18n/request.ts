import { getUserLocale } from "@/lib/locale";
import { getRequestConfig } from "next-intl/server";

type Messages = Record<string, unknown>;
type MessagesModule = { default: Messages };

export default getRequestConfig(async () => {
  const locale = await getUserLocale();
  const { default: defaultMessages } =
    (await import("../../messages/en.json")) as MessagesModule;
  const localeMessages =
    locale === "en"
      ? defaultMessages
      : ((await import(`../../messages/${locale}.json`)) as MessagesModule)
          .default;

  return {
    locale,
    messages: localeMessages,
  };
});
