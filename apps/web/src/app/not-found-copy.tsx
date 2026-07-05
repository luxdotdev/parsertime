"use client";

import { Link } from "@/components/ui/link";
import { useTranslations } from "next-intl";

/**
 * Client so the copy prerenders into the static shell from the intl
 * provider's default-locale messages (a server `getTranslations` call would
 * read the LOCALE cookie and force the whole 404 page dynamic). Non-default
 * locales swap in once the root layout's locale island hydrates.
 */
export function NotFoundCopy() {
  const t = useTranslations("notFound");

  return (
    <>
      <div className="flex flex-1 flex-col justify-center py-12">
        <div className="max-w-lg">
          <p className="not-found-eyebrow font-mono text-sm font-semibold tracking-[0.15em] text-[#ee1c25]">
            {t("404")}
          </p>
          <h1 className="not-found-title mt-4 font-mono text-4xl font-extrabold tracking-tight sm:text-6xl">
            {t("header")}
          </h1>
          <p className="not-found-desc text-muted-foreground mt-6 text-base leading-7">
            {t("description")}
          </p>
          <div className="mt-10">
            <Link
              href="/"
              className="font-mono text-sm font-semibold text-[#ee1c25]"
            >
              <span aria-hidden="true">&larr;</span> {t("backHome")}
            </Link>
          </div>
        </div>
      </div>

      <footer className="text-muted-foreground pt-8 text-sm">
        <Link href="/contact">{t("contact")}</Link>
      </footer>
    </>
  );
}
