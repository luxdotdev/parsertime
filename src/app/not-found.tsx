import { getTranslations } from "next-intl/server";
import Image from "next/image";
import Link from "next/link";

export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="h-full">
      <div className="grid min-h-full grid-cols-1 grid-rows-[1fr,auto,1fr] bg-white dark:bg-black lg:grid-cols-[max(50%,36rem),1fr]">
        <header className="mx-auto w-full max-w-7xl px-6 pt-6 sm:pt-10 lg:col-span-2 lg:col-start-1 lg:row-start-1 lg:px-8">
          <Link href="/">
            <span className="sr-only">Parsertime</span>
            <Image
              className="h-10 w-auto dark:invert sm:h-12"
              src="/parsertime.png"
              alt=""
              width={40}
              height={40}
            />
          </Link>
        </header>
        <main className="mx-auto w-full max-w-7xl px-6 py-24 sm:py-32 lg:col-span-2 lg:col-start-1 lg:row-start-2 lg:px-8">
          <div className="max-w-lg">
            <p className="text-base font-semibold leading-8 text-sky-600 dark:text-sky-400">
              {t("404")}
            </p>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-50 sm:text-5xl">
              {t("header")}
            </h1>
            <p className="mt-6 text-base leading-7 text-gray-600 dark:text-gray-300">
              {t("description")}
            </p>
            <div className="mt-10">
              <Link
                href="/"
                className="text-sm font-semibold leading-7 text-sky-600 dark:text-sky-400"
              >
                <span aria-hidden="true">&larr;</span> {t("backHome")}
              </Link>
            </div>
          </div>
        </main>
        <footer className="self-end lg:col-span-2 lg:col-start-1 lg:row-start-3">
          <div className="border-t border-gray-100 bg-gray-50 py-10 dark:border-gray-900 dark:bg-zinc-950">
            <nav className="mx-auto flex w-full max-w-7xl items-center gap-x-4 px-6 text-sm leading-7 text-gray-600 lg:px-8">
              <Link href="/contact">{t("contact")}</Link>
            </nav>
          </div>
        </footer>
        <div className="hidden lg:relative lg:col-start-2 lg:row-start-1 lg:row-end-4 lg:block">
          <Image
            src="/not-found.avif"
            alt=""
            fill
            className="absolute inset-0 h-full w-full object-cover"
          />
        </div>
      </div>
    </div>
  );
}
