import { Link } from "@/components/ui/link";
import Image from "next/image";
import { fallingHalftoneSvg } from "./falling-halftone";
import { NotFoundCopy } from "./not-found-copy";

// Fully static: the SVG art stays server-rendered (it would bloat the client
// bundle), and the translated copy lives in the NotFoundCopy client component
// so this route prerenders instead of reading the LOCALE cookie.
export default function NotFound() {
  return (
    <div className="bg-background text-foreground relative min-h-svh">
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

          <NotFoundCopy />
        </div>
      </div>
    </div>
  );
}
