"use client";

import { HoverPrefetchLink } from "@/components/ui/hover-prefetch-link";
import type { Route } from "next";
import { usePathname, useSearchParams } from "next/navigation";

// Moved verbatim from the original team stats page.
const tabTriggerClass =
  "text-muted-foreground hover:text-foreground data-[state=active]:text-foreground border-0 border-b-2 border-b-transparent data-[state=active]:border-b-primary rounded-none bg-transparent px-0 pb-3 pt-1 font-mono text-[11px] tracking-[0.16em] uppercase shadow-none data-[state=active]:shadow-none data-[state=active]:bg-transparent dark:bg-transparent dark:data-[state=active]:bg-transparent dark:data-[state=active]:border-b-primary transition-colors";

type TabDef = { segment: string; label: string };

const BASE_TABS: TabDef[] = [
  { segment: "", label: "Overview" },
  { segment: "performance", label: "Performance" },
  { segment: "heroes", label: "Heroes" },
  { segment: "trends", label: "Trends" },
  { segment: "maps", label: "Maps" },
  { segment: "swaps", label: "Swaps" },
  { segment: "teamfights", label: "Teamfights" },
  { segment: "ultimates", label: "Ultimates" },
  { segment: "winrates", label: "Winrates" },
  { segment: "charts", label: "Charts" },
];

export function TeamStatsTabsNav({
  teamId,
  positionalEnabled,
  simulationEnabled,
}: {
  teamId: number;
  positionalEnabled: boolean;
  simulationEnabled: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const base = `/stats/team/${teamId}`;
  const qs = searchParams.toString();

  const tabs: TabDef[] = [
    ...BASE_TABS,
    ...(positionalEnabled
      ? [
          { segment: "positional", label: "Positional" },
          { segment: "tendencies", label: "Tendencies" },
        ]
      : []),
    ...(simulationEnabled ? [{ segment: "simulator", label: "Simulator" }] : []),
  ];

  return (
    <nav className="border-border mt-6 flex h-auto w-full flex-wrap justify-start gap-6 border-b">
      {tabs.map((tab) => {
        const path = tab.segment ? `${base}/${tab.segment}` : base;
        const href = (qs ? `${path}?${qs}` : path) as Route;
        const isActive = pathname === path;
        return (
          <HoverPrefetchLink
            key={tab.segment || "overview"}
            href={href}
            data-state={isActive ? "active" : "inactive"}
            className={tabTriggerClass}
          >
            {tab.label}
          </HoverPrefetchLink>
        );
      })}
    </nav>
  );
}
