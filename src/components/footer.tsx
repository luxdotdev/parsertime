import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { get } from "@vercel/edge-config";
import type { Route } from "next";
import { getTranslations } from "next-intl/server";
import Image from "next/image";

export async function Footer() {
  const t = await getTranslations("footer");

  const [version, changelog] = await Promise.all([
    get<string>("version"),
    get<Route>("changelog"),
  ]);

  return (
    <footer className="relative z-20 border-t border-zinc-200 dark:border-zinc-800">
      <div className="container mx-auto flex flex-col items-center justify-between px-6 py-8 lg:flex-row">
        <div className="flex items-center gap-1">
          <Link href="/" aria-label="Home">
            <Image
              src="/parsertime.png"
              alt="Logo"
              width={50}
              height={50}
              className="h-7 w-auto dark:invert"
            />
          </Link>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={changelog ?? "https://lux.dev/blog"}
                  target="_blank"
                  className="text-xs text-gray-600 dark:text-gray-300"
                >
                  {version ?? ""}
                </Link>
              </TooltipTrigger>
              <TooltipContent>{t("changelog")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

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

        <p className="mt-6 text-sm text-gray-500 lg:mt-0 dark:text-gray-400">
          &copy; 2024&ndash;{new Date().getFullYear()} lux.dev.
        </p>
      </div>
    </footer>
  );
}
