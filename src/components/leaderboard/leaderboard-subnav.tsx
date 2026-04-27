"use client";

import { LEADERBOARD_METRICS } from "@/lib/leaderboard/registry";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function LeaderboardSubnav() {
  const pathname = usePathname();
  return (
    <nav
      role="tablist"
      aria-label="Leaderboard variant"
      className="border-border bg-card inline-flex rounded-md border p-0.5"
    >
      {LEADERBOARD_METRICS.map((m) => {
        const active = pathname === m.href;
        return (
          <Link
            key={m.id}
            role="tab"
            aria-selected={active}
            href={m.href}
            className={cn(
              "h-8 rounded-sm px-3 text-sm leading-8 transition-colors",
              active
                ? "bg-primary text-primary-foreground font-medium"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="hidden sm:inline">{m.fullName}</span>
            <span className="font-mono text-xs tracking-wider sm:hidden">
              {m.shortLabel}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
