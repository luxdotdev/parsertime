import { Link } from "@/components/ui/link";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { fallingHalftoneSvg } from "./falling-halftone";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="relative min-h-svh bg-background text-foreground">
      {/* Desktop only: full-width red→chrome bleed behind both columns. */}
      <div
        aria-hidden="true"
        className="not-found-canvas pointer-events-none absolute inset-0 hidden lg:block"
      >
        <div className="not-found-grain not-found-grain-right absolute inset-0" />
      </div>

      <div className="relative z-10 grid min-h-svh grid-rows-[auto_1fr] lg:grid-cols-2 lg:grid-rows-1">
        {/* Art panel — red poster. Solid red on mobile; on desktop it's
            transparent and the canvas behind supplies the red. First on mobile. */}
        <div
          aria-hidden="true"
          className="not-found-art relative order-first flex min-h-[40svh] items-center justify-center overflow-hidden p-8 text-black sm:p-12 lg:order-last lg:min-h-svh"
        >
          <div className="not-found-grain lg:hidden" />
          <div
            className="not-found-figure relative mx-auto w-full max-w-md [&_svg]:mx-auto [&_svg]:h-[40svh] [&_svg]:w-auto lg:[&_svg]:h-auto lg:[&_svg]:w-full"
            dangerouslySetInnerHTML={{ __html: fallingHalftoneSvg }}
          />
        </div>

        {/* Chrome panel — themed. */}
        <div className="flex flex-col p-6 sm:p-10 lg:p-14">
          <Link href="/" className="inline-flex w-fit">
            <span className="sr-only">Parsertime</span>
            <Image
              className="h-10 w-auto sm:h-12 dark:invert"
              src="/parsertime.png"
              alt=""
              width={40}
              height={40}
              priority
            />
          </Link>

          <div className="flex flex-1 flex-col justify-center py-12">
            <div className="max-w-lg">
              <p className="not-found-eyebrow font-mono text-sm font-semibold tracking-[0.15em] text-[#ee1c25]">
                {t("404")}
              </p>
              <h1 className="not-found-title mt-4 font-mono text-4xl font-extrabold tracking-tight sm:text-6xl">
                {t("header")}
              </h1>
              <p className="not-found-desc mt-6 text-base leading-7 text-muted-foreground">
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

          <footer className="pt-8 text-sm text-muted-foreground">
            <Link href="/contact">{t("contact")}</Link>
          </footer>
        </div>
      </div>
    </div>
  );
}
