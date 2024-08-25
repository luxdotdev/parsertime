import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("footer");
  return (
    <footer className="relative z-20 border-t border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto flex flex-col items-center justify-between px-6 py-8 lg:flex-row">
        <Link href="/" aria-label="Home">
          <Image
            src="/parsertime.png"
            alt=""
            width={50}
            height={50}
            className="h-7 w-auto dark:invert"
          />
        </Link>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-4 lg:mt-0 lg:gap-6">
          <Link
            href="/dashboard"
            className="text-sm text-gray-600 transition-colors duration-300 hover:text-black dark:text-gray-300 dark:hover:text-white"
          >
            {t("dashboard")}
          </Link>
          <Link
            href="/stats"
            className="text-sm text-gray-600 transition-colors duration-300 hover:text-black dark:text-gray-300 dark:hover:text-white"
          >
            {t("stats")}
          </Link>
          <Link
            href="/team"
            className="text-sm text-gray-600 transition-colors duration-300 hover:text-black dark:text-gray-300 dark:hover:text-white"
          >
            {t("teams")}
          </Link>
          <Link
            href="/settings"
            className="text-sm text-gray-600 transition-colors duration-300 hover:text-black dark:text-gray-300 dark:hover:text-white"
          >
            {t("settings")}
          </Link>
          <Link
            href="/contact"
            className="text-sm text-gray-600 transition-colors duration-300 hover:text-black dark:text-gray-300 dark:hover:text-white"
          >
            {t("contact")}
          </Link>
          <Link
            href="https://docs.parsertime.app"
            target="_blank"
            className="text-sm text-gray-600 transition-colors duration-300 hover:text-black dark:text-gray-300 dark:hover:text-white"
          >
            {t("docs")}
          </Link>
        </div>

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400 lg:mt-0">
          &copy;
          {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
