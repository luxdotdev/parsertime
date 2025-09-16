"use client";

import { Link } from "@/components/ui/link";
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
          "text-muted-foreground hover:text-primary text-sm font-medium transition-colors",
          pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
        )}
      >
        {t("dashboard")}
      </Link>
      <Link
        href="/stats"
        className={cn(
          "text-muted-foreground hover:text-primary text-sm font-medium transition-colors",
          pathname === "/stats" ? "text-primary" : "text-muted-foreground"
        )}
      >
        {t("stats")}
      </Link>
      <Link
        href="/team"
        className={cn(
          "hover:text-primary text-sm font-medium transition-colors",
          pathname.split("/")[1] === "team"
            ? "text-primary"
            : "text-muted-foreground"
        )}
      >
        {t("teams")}
      </Link>
      <Link
        href="/settings"
        className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
      >
        {t("settings")}
      </Link>
      <Link
        href="/contact"
        className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
      >
        {t("contact")}
      </Link>
      <Link
        href="https://docs.parsertime.app"
        target="_blank"
        className="text-muted-foreground hover:text-primary text-sm font-medium transition-colors"
      >
        {t("docs")}
      </Link>
    </nav>
  );
}
