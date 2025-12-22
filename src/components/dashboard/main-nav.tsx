"use client";

import { Link } from "@/components/ui/link";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function MainNav({ className }: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.mainNav");
  const isMobile = useIsMobile();

  return (
    <NavigationMenu
      className={cn("flex items-center", className)}
      viewport={!isMobile}
    >
      <NavigationMenuList className="flex-wrap space-x-2 lg:space-x-4">
        <NavigationMenuItem asChild>
          <Link
            href="/dashboard"
            className={cn(
              "text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors",
              pathname === "/dashboard"
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {t("dashboard")}
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem>
          <NavigationMenuTrigger
            className={cn(
              "text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors",
              pathname.startsWith("/stats")
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {t("stats")}
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <ul className="grid w-[200px]">
              <li>
                <NavigationMenuLink asChild>
                  <Link
                    href="/stats"
                    className={cn(
                      "text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors",
                      pathname === "/stats"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {t("playerStats")}
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/stats/hero"
                    className={cn(
                      "text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors",
                      pathname === "/stats/hero"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {t("heroStats")}
                  </Link>
                </NavigationMenuLink>
                <NavigationMenuLink asChild>
                  <Link
                    href="/stats/compare"
                    className={cn(
                      "text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors",
                      pathname === "/stats/compare"
                        ? "text-primary"
                        : "text-muted-foreground"
                    )}
                  >
                    {t("compareStats")}
                  </Link>
                </NavigationMenuLink>
              </li>
            </ul>
          </NavigationMenuContent>
        </NavigationMenuItem>
        <NavigationMenuItem asChild>
          <Link
            href="/leaderboard"
            className={cn(
              "text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors",
              pathname === "/leaderboard"
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {t("leaderboard")}
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem asChild>
          <Link
            href="/team"
            className={cn(
              "hover:text-primary px-1 py-1 text-sm font-medium transition-colors",
              pathname.split("/")[1] === "team"
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            {t("teams")}
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem asChild>
          <Link
            href="/settings"
            className="text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors"
          >
            {t("settings")}
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem asChild>
          <Link
            href="/contact"
            className="text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors"
          >
            {t("contact")}
          </Link>
        </NavigationMenuItem>
        <NavigationMenuItem asChild>
          <Link
            href="https://docs.parsertime.app"
            target="_blank"
            className="text-muted-foreground hover:text-primary px-1 py-1 text-sm font-medium transition-colors"
          >
            {t("docs")}
          </Link>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  );
}
