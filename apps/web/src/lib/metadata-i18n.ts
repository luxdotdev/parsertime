import { defaultLocale, type Locale } from "@/i18n/config";
import { createTranslator } from "next-intl";
import enMessages from "../../messages/en.json";

/**
 * Cookie-free translator for `generateMetadata`.
 *
 * next-intl's `getTranslations` always resolves the per-request locale through
 * the request config (`getUserLocale` → `cookies()`), which forces every
 * route's `<head>` to render dynamically under Cache Components. Metadata is
 * instead resolved in the default locale from the statically-imported catalog
 * so it can be prerendered. Page content is still localized at runtime via the
 * `NextIntlClientProvider` in the root layout.
 */
export function getMetadataTranslations(namespace?: string) {
  return getStaticTranslations(namespace);
}

/**
 * The same cookie-free, default-locale translator for static-shell UI:
 * `loading.tsx` skeletons and Suspense fallbacks. Fallbacks must be
 * prerenderable — `getTranslations` reads the LOCALE cookie and would force
 * the shell dynamic. The localized content replaces them when it streams.
 */
export function getStaticTranslations(namespace?: string) {
  // The app does not augment next-intl's global `Messages` type, so cast to the
  // translator's default (loosely-typed) options instead of having it infer a
  // strict namespace union from the imported catalog.
  return createTranslator({
    locale: defaultLocale,
    messages: enMessages,
    namespace,
  } as Parameters<typeof createTranslator>[0]);
}

/**
 * Cookie-free translator for an EXPLICIT locale, for use inside `"use cache"`
 * scopes. `getTranslations` resolves the locale from the LOCALE cookie, and
 * request APIs are forbidden inside public cache scopes — so cached server
 * components take the locale as a prop (making it part of the cache key) and
 * translate through this instead.
 */
export async function getLocaleTranslations(
  locale: Locale,
  namespace?: string
) {
  const messages =
    locale === defaultLocale
      ? enMessages
      : (
          (await import(`../../messages/${locale}.json`)) as {
            default: typeof enMessages;
          }
        ).default;
  return createTranslator({
    locale,
    messages,
    namespace,
  } as Parameters<typeof createTranslator>[0]);
}
