import { defaultLocale } from "@/i18n/config";
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
  // The app does not augment next-intl's global `Messages` type, so cast to the
  // translator's default (loosely-typed) options instead of having it infer a
  // strict namespace union from the imported catalog.
  return createTranslator({
    locale: defaultLocale,
    messages: enMessages,
    namespace,
  } as Parameters<typeof createTranslator>[0]);
}
