"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { RoleTrio } from "@/data/team-role-stats-dto";
import { cn } from "@/lib/utils";
import {
  ChevronDown,
  Heart,
  Shield,
  Swords,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type BestRoleTriosCardProps = {
  trios: RoleTrio[];
};

export function BestRoleTriosCard({ trios }: BestRoleTriosCardProps) {
  const t = useTranslations("teamStatsPage.bestRoleTriosCard");
  const [expandedTrios, setExpandedTrios] = useState<Set<number>>(new Set([0]));

  if (trios.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">{t("noData")}</p>
        </CardContent>
      </Card>
    );
  }

  function toggleTrio(index: number) {
    setExpandedTrios((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Best Role Trios</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {trios.map((trio, index) => (
            <Collapsible
              key={`${trio.tank}-${trio.dps1}-${trio.dps2}-${trio.support1}-${trio.support2}`}
              open={expandedTrios.has(index)}
              onOpenChange={() => toggleTrio(index)}
            >
              <div
                className={cn(
                  "rounded-lg border p-4 transition-colors",
                  expandedTrios.has(index) ? "bg-muted/50" : "hover:bg-muted/30"
                )}
              >
                <CollapsibleTrigger className="w-full">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-muted-foreground text-lg font-bold">
                        #{index + 1}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "font-bold",
                            trio.winrate >= 60
                              ? "bg-green-500"
                              : trio.winrate >= 50
                                ? "bg-blue-500"
                                : "bg-red-500"
                          )}
                        >
                          {trio.winrate.toFixed(1)}%
                        </Badge>
                        <span className="text-muted-foreground text-sm">
                          {t("gamesPlayed", { count: trio.gamesPlayed })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm">
                        <span className="text-green-600 dark:text-green-400">
                          {t("wins", { count: trio.wins })}
                        </span>
                        {" - "}
                        <span className="text-red-600 dark:text-red-400">
                          {t("losses", { count: trio.losses })}
                        </span>
                      </div>
                      <ChevronDown
                        className={cn(
                          "text-muted-foreground h-4 w-4 transition-transform",
                          expandedTrios.has(index) && "rotate-180"
                        )}
                      />
                    </div>
                  </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                  <div className="mt-4 space-y-3">
                    <div className="bg-background rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-xs font-semibold text-blue-600 uppercase dark:text-blue-400">
                          {t("tank")}
                        </span>
                      </div>
                      <p className="font-medium">{trio.tank}</p>
                    </div>

                    <div className="bg-background rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Swords className="h-4 w-4 text-red-600 dark:text-red-400" />
                        <span className="text-xs font-semibold text-red-600 uppercase dark:text-red-400">
                          {t("damage")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{trio.dps1}</p>
                        <p className="font-medium">{trio.dps2}</p>
                      </div>
                    </div>

                    <div className="bg-background rounded-lg border p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <Heart className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
                        <span className="text-xs font-semibold text-yellow-600 uppercase dark:text-yellow-400">
                          {t("support")}
                        </span>
                      </div>
                      <div className="space-y-1">
                        <p className="font-medium">{trio.support1}</p>
                        <p className="font-medium">{trio.support2}</p>
                      </div>
                    </div>

                    <div className="bg-muted/50 flex items-center justify-between rounded-lg p-3">
                      <span className="text-muted-foreground text-sm">
                        {t("winRate")}
                      </span>
                      <div className="flex items-center gap-2">
                        {trio.winrate >= 50 ? (
                          <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                        )}
                        <span
                          className={cn(
                            "text-lg font-bold",
                            trio.winrate >= 50
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          )}
                        >
                          {trio.winrate.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>

        {trios.length === 0 && (
          <p className="text-muted-foreground text-center text-sm">
            {t("playMoreGames")}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
