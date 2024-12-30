"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();
  const t = useTranslations("dashboard.mainNav");

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/dashboard"
        className={cn(
          "text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
        )}
      >
        {t("dashboard")}
      </Link>
      <Link
        href="/stats"
        className={cn(
          "text-sm font-medium text-muted-foreground transition-colors hover:text-primary",
          pathname === "/stats" ? "text-primary" : "text-muted-foreground"
        )}
      >
        {t("stats")}
      </Link>
      <Link
        href="/team"
        className={cn(
          "text-sm font-medium transition-colors hover:text-primary",
          pathname.split("/")[1] === "team"
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        {t("teams")}
      </Link>
      <Link
        href="/settings"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        {t("settings")}
      </Link>
      <Link
        href="/contact"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        {t("contact")}
      </Link>
      <Link
        href="https://docs.parsertime.app"
        target="_blank"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        {t("docs")}
      </Link>
    </nav>
  );
}
