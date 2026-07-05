"use client";

import { defaultLocale, type Locale } from "@/i18n/config";
import type { AbstractIntlMessages } from "next-intl";
import { NextIntlClientProvider } from "next-intl";
import { createContext, use, useEffect, useState } from "react";

type IntlOverride = { locale: Locale; messages: AbstractIntlMessages };

const IntlOverrideContext = createContext<(override: IntlOverride) => void>(
  () => undefined
);

/**
 * Stateful shell around `NextIntlClientProvider` so the root layout can stay
 * in the static shell: it renders immediately with the bundled default-locale
 * messages, and `IntlHydrator` (streamed from a request-time island) swaps in
 * the cookie-selected locale once known. Users on the default locale never
 * see a swap; other locales briefly render client strings in the default
 * locale on hard loads. Server components are unaffected — they resolve
 * `getTranslations` per request as before.
 */
export function IntlProvider({
  children,
  defaultMessages,
}: {
  children: React.ReactNode;
  defaultMessages: AbstractIntlMessages;
}) {
  const [override, setOverride] = useState<IntlOverride | null>(null);

  return (
    <IntlOverrideContext value={setOverride}>
      <NextIntlClientProvider
        locale={override?.locale ?? defaultLocale}
        messages={override?.messages ?? defaultMessages}
        // Explicit so next-intl never "environment-falls-back" to the server
        // request config during prerender — that path reads the LOCALE cookie
        // and would force every route with client translations to be dynamic.
        // UTC matches what the fallback resolved to on Vercel before.
        timeZone="UTC"
      >
        {children}
      </NextIntlClientProvider>
    </IntlOverrideContext>
  );
}

/** Rendered by the request-time island; pushes the real locale into state. */
export function IntlHydrator({
  locale,
  messages,
}: {
  locale: Locale;
  messages: AbstractIntlMessages;
}) {
  const setOverride = use(IntlOverrideContext);

  useEffect(() => {
    setOverride({ locale, messages });
  }, [locale, messages, setOverride]);

  return null;
}
