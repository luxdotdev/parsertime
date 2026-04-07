"use client";

import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import { ChevronDownIcon } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

const navLinkStyles =
  "text-muted-foreground hover:text-primary inline-flex min-h-11 items-center px-1.5 text-sm font-medium transition-colors";

const dropdownItemStyles =
  "hover:bg-accent hover:text-accent-foreground flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors";

const STATS_PLAYER_ROUTE = /^\/stats\/(?!hero$|team$|compare$)[^/]+$/;
const SCOUTING_TEAM_ROUTE = /^\/scouting\/(?!player$|team$)[^/]+$/;

function handleDropdownKeyDown(e: React.KeyboardEvent<HTMLLIElement>) {
  if (e.key === "Escape") {
    const trigger = e.currentTarget.querySelector("button");
    trigger?.focus();
    trigger?.blur();
  }
}

export function MainNav({
  scoutingEnabled,
  aiChatEnabled,
  dataToolsEnabled,
  tournamentEnabled,
  coachingCanvasEnabled,
  className,
}: React.HTMLAttributes<HTMLElement> & {
  scoutingEnabled: boolean;
  aiChatEnabled?: boolean;
  dataToolsEnabled?: boolean;
  tournamentEnabled?: boolean;
  coachingCanvasEnabled?: boolean;
}) {
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
        <li className="group relative" onKeyDown={handleDropdownKeyDown}>
          <button
            type="button"
            aria-haspopup="true"
            className={cn(
              navLinkStyles,
              "gap-1",
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
            <div
              className="bg-popover text-popover-foreground ring-foreground/10 w-[200px] rounded-md p-1 shadow-md ring-1"
              role="menu"
            >
              <Link
                href="/stats"
                role="menuitem"
                className={cn(
                  dropdownItemStyles,
                  (STATS_PLAYER_ROUTE.test(pathname) ||
                    pathname === "/stats") &&
                    "text-primary"
                )}
              >
                {t("playerStats")}
              </Link>
              <Link
                href="/stats/hero"
                role="menuitem"
                className={cn(
                  dropdownItemStyles,
                  pathname.startsWith("/stats/hero") && "text-primary"
                )}
              >
                {t("heroStats")}
              </Link>
              <Link
                href="/stats/team"
                role="menuitem"
                className={cn(
                  dropdownItemStyles,
                  pathname.startsWith("/stats/team") && "text-primary"
                )}
              >
                {t("teamStats")}
              </Link>
              <Link
                href="/stats/compare"
                role="menuitem"
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
        {tournamentEnabled && (
          <li>
            <Link
              href={"/tournaments" as Route}
              className={cn(
                navLinkStyles,
                pathname.startsWith("/tournaments") && "text-primary"
              )}
            >
              {t("tournaments")}
            </Link>
          </li>
        )}
        {aiChatEnabled && (
          <li className="group relative" onKeyDown={handleDropdownKeyDown}>
            <button
              type="button"
              aria-haspopup="true"
              className={cn(
                navLinkStyles,
                "gap-1",
                (pathname.startsWith("/chat") ||
                  pathname.startsWith("/reports")) &&
                  "text-primary"
              )}
            >
              {t("chat")}
              <ChevronDownIcon
                className="size-3 transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180"
                aria-hidden="true"
              />
            </button>
            <div className="invisible absolute top-full left-0 z-50 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div
                className="bg-popover text-popover-foreground ring-foreground/10 w-[200px] rounded-md p-1 shadow-md ring-1"
                role="menu"
              >
                <Link
                  href="/chat"
                  role="menuitem"
                  className={cn(
                    dropdownItemStyles,
                    pathname === "/chat" && "text-primary"
                  )}
                >
                  {t("chatNew")}
                </Link>
                <Link
                  href={"/reports" as Route}
                  role="menuitem"
                  className={cn(
                    dropdownItemStyles,
                    pathname.startsWith("/reports") && "text-primary"
                  )}
                >
                  {t("chatReports")}
                </Link>
              </div>
            </div>
          </li>
        )}
        {scoutingEnabled && (
          <li className="group relative" onKeyDown={handleDropdownKeyDown}>
            <button
              type="button"
              aria-haspopup="true"
              className={cn(
                navLinkStyles,
                "gap-1",
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
              <div
                className="bg-popover text-popover-foreground ring-foreground/10 w-[200px] rounded-md p-1 shadow-md ring-1"
                role="menu"
              >
                <Link
                  href="/scouting"
                  role="menuitem"
                  className={cn(
                    dropdownItemStyles,
                    (SCOUTING_TEAM_ROUTE.test(pathname) ||
                      pathname === "/scouting") &&
                      "text-primary"
                  )}
                >
                  {t("scoutTeam")}
                </Link>
                <Link
                  href="/scouting/player"
                  role="menuitem"
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
        {dataToolsEnabled && (
          <li className="group relative" onKeyDown={handleDropdownKeyDown}>
            <button
              type="button"
              aria-haspopup="true"
              className={cn(
                navLinkStyles,
                "gap-1",
                (pathname.startsWith("/data-labeling") ||
                  pathname.startsWith("/map-calibration")) &&
                  "text-primary"
              )}
            >
              {t("dataTools")}
              <ChevronDownIcon
                className="size-3 transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180"
                aria-hidden="true"
              />
            </button>
            <div className="invisible absolute top-full left-0 z-50 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div
                className="bg-popover text-popover-foreground ring-foreground/10 w-[200px] rounded-md p-1 shadow-md ring-1"
                role="menu"
              >
                <Link
                  href="/data-labeling"
                  role="menuitem"
                  className={cn(
                    dropdownItemStyles,
                    pathname.startsWith("/data-labeling") && "text-primary"
                  )}
                >
                  {t("dataLabeling")}
                </Link>
                <Link
                  href={"/map-calibration" as Route}
                  role="menuitem"
                  className={cn(
                    dropdownItemStyles,
                    pathname.startsWith("/map-calibration") && "text-primary"
                  )}
                >
                  {t("mapCalibration")}
                </Link>
              </div>
            </div>
          </li>
        )}
        {coachingCanvasEnabled && (
          <li className="group relative" onKeyDown={handleDropdownKeyDown}>
            <button
              type="button"
              aria-haspopup="true"
              className={cn(
                navLinkStyles,
                "gap-1",
                pathname.startsWith("/coaching") && "text-primary"
              )}
            >
              {t("coaching")}
              <ChevronDownIcon
                className="size-3 transition-transform duration-200 group-focus-within:rotate-180 group-hover:rotate-180"
                aria-hidden="true"
              />
            </button>
            <div className="invisible absolute top-full left-0 z-50 pt-1 opacity-0 transition-[opacity,visibility] duration-150 group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
              <div
                className="bg-popover text-popover-foreground ring-foreground/10 w-[200px] rounded-md p-1 shadow-md ring-1"
                role="menu"
              >
                <Link
                  href={"/coaching/canvas" as Route}
                  role="menuitem"
                  className={cn(
                    dropdownItemStyles,
                    pathname.startsWith("/coaching/canvas") && "text-primary"
                  )}
                >
                  {t("coachingCanvas")}
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
