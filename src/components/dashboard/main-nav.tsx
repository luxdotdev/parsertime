"use client";

import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const navLinkStyles =
  "text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors";

const dropdownItemStyles =
  "hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors";

export function MainNav({
  scoutingEnabled,
  className,
}: React.HTMLAttributes<HTMLElement> & { scoutingEnabled: boolean }) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.mainNav");

  return (
    <nav className={cn("flex items-center", className)}>
      <ul className="flex flex-wrap items-center space-x-2 lg:space-x-4">
        <li>
          <Link
            href="/dashboard"
            className={cn(
              navLinkStyles,
              pathname === "/dashboard" && "text-primary"
            )}
          >
            {t("dashboard")}
          </Link>
        </li>
        <li className="group relative">
          <button
            type="button"
            className={cn(
              navLinkStyles,
              "inline-flex items-center gap-1",
              pathname.startsWith("/stats") && "text-primary"
            )}
          >
            {t("stats")}
            <ChevronDownIcon
              className="size-3 transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180"
              aria-hidden="true"
            />
          </button>
          <div className="invisible absolute top-full left-0 z-50 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
            <div className="bg-popover text-popover-foreground ring-foreground/10 w-[200px] rounded-md p-1 shadow-md ring-1">
              <Link
                href="/stats"
                className={cn(
                  dropdownItemStyles,
                  (/^\/stats\/(?!hero$|team$|compare$)[^\/]+$/.test(pathname) ||
                    pathname === "/stats") &&
                    "text-primary"
                )}
              >
                {t("playerStats")}
              </Link>
              <Link
                href="/stats/hero"
                className={cn(
                  dropdownItemStyles,
                  pathname.startsWith("/stats/hero") && "text-primary"
                )}
              >
                {t("heroStats")}
              </Link>
              <Link
                href="/stats/team"
                className={cn(
                  dropdownItemStyles,
                  pathname.startsWith("/stats/team") && "text-primary"
                )}
              >
                {t("teamStats")}
              </Link>
              <Link
                href="/stats/compare"
                className={cn(
                  dropdownItemStyles,
                  pathname === "/stats/compare" && "text-primary"
                )}
              >
                {t("compareStats")}
              </Link>
            </div>
          </div>
        </li>
        <li>
          <Link
            href="/leaderboard"
            className={cn(
              navLinkStyles,
              pathname === "/leaderboard" && "text-primary"
            )}
          >
            {t("leaderboard")}
          </Link>
        </li>
        <li>
          <Link
            href="/team"
            className={cn(
              navLinkStyles,
              pathname.split("/")[1] === "team" && "text-primary"
            )}
          >
            {t("teams")}
          </Link>
        </li>
        {scoutingEnabled && (
          <li className="group relative">
            <button
              type="button"
              className={cn(
                navLinkStyles,
                "inline-flex items-center gap-1",
                pathname.startsWith("/scouting") && "text-primary"
              )}
            >
              {t("scouting")}
              <ChevronDownIcon
                className="size-3 transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180"
                aria-hidden="true"
              />
            </button>
            <div className="invisible absolute top-full left-0 z-50 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div className="bg-popover text-popover-foreground ring-foreground/10 w-[200px] rounded-md p-1 shadow-md ring-1">
                <Link
                  href="/scouting"
                  className={cn(
                    dropdownItemStyles,
                    (/^\/scouting\/(?!player$|team$)[^\/]+$/.test(pathname) ||
                      pathname === "/scouting") &&
                      "text-primary"
                  )}
                >
                  {t("scoutTeam")}
                </Link>
                <Link
                  href="/scouting/player"
                  className={cn(
                    dropdownItemStyles,
                    pathname.startsWith("/scouting/player") && "text-primary"
                  )}
                >
                  {t("scoutPlayer")}
                </Link>
              </div>
            </div>
          </li>
        )}
        <li>
          <Link href="/settings" className={navLinkStyles}>
            {t("settings")}
          </Link>
        </li>
        <li>
          <Link href="/contact" className={navLinkStyles}>
            {t("contact")}
          </Link>
        </li>
        <li>
          <Link
            href="https://docs.parsertime.app"
            target="_blank"
            className={navLinkStyles}
          >
            {t("docs")}
          </Link>
        </li>
      </ul>
    </nav>
  );
}
