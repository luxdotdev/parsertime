"use client";

import Link from "next/link";

import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      <Link
        href="/dashboard"
        className={cn(
          "text-sm font-medium transition-colors text-muted-foreground hover:text-primary",
          pathname === "/dashboard" ? "text-primary" : "text-muted-foreground"
        )}
      >
        Dashboard
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
        Teams
      </Link>
      <Link
        href="/"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Products
      </Link>
      <Link
        href="/"
        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
      >
        Settings
      </Link>
    </nav>
  );
}
