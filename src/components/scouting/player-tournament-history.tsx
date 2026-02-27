"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { TournamentRecord } from "@/data/player-scouting-dto";
import { cn, toHero } from "@/lib/utils";
import { ChevronDown, Info } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useState } from "react";

type PlayerTournamentHistoryProps = {
  tournamentRecords: TournamentRecord[];
};

export function PlayerTournamentHistory({
  tournamentRecords,
}: PlayerTournamentHistoryProps) {
  const t = useTranslations("scoutingPage.player.profile");

  if (tournamentRecords.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
          <Info className="text-muted-foreground h-8 w-8" aria-hidden="true" />
          <p className="text-muted-foreground text-sm">
            {t("noTournamentData")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("tournamentHistory")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {tournamentRecords.map((record) => (
          <TournamentEntry key={record.tournamentTitle} record={record} />
        ))}
      </CardContent>
    </Card>
  );
}

function TournamentEntry({ record }: { record: TournamentRecord }) {
  const t = useTranslations("scoutingPage.player.profile");
  const [open, setOpen] = useState(false);

  const winRateColor =
    record.winRate >= 60
      ? "text-emerald-600 dark:text-emerald-400"
      : record.winRate < 40
        ? "text-red-600 dark:text-red-400"
        : "text-foreground";

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-4 rounded-lg border px-4 py-3 text-left transition-colors">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {record.tournamentTitle}
          </p>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            <span>
              {t("team")}: {record.teamName}
            </span>
            <span>
              {t("role")}: {record.role}
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium tabular-nums">
              {record.wins}W &ndash; {record.losses}L
            </p>
            {record.matches.length > 0 && (
              <p
                className={cn("text-xs font-medium tabular-nums", winRateColor)}
              >
                {record.winRate.toFixed(0)}% {t("winRate")}
              </p>
            )}
          </div>
          <ChevronDown
            className={cn(
              "text-muted-foreground h-4 w-4 shrink-0 transition-transform",
              open && "rotate-180"
            )}
            aria-hidden="true"
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-2 space-y-1 pl-2">
          {record.matches.map((match, i) => (
            <div
              key={`${match.opponent}-${match.date.toISOString()}`}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm",
                i % 2 === 0 ? "bg-muted/30" : ""
              )}
            >
              <span
                className={cn(
                  "w-5 shrink-0 text-center text-xs font-bold",
                  match.result === "win"
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                )}
              >
                {match.result === "win" ? t("win") : t("loss")}
              </span>
              <span className="text-muted-foreground w-12 shrink-0 text-center text-xs tabular-nums">
                {match.teamScore ?? "?"}&ndash;{match.opponentScore ?? "?"}
              </span>
              <span className="min-w-0 flex-1 truncate">
                vs {match.opponentFullName || match.opponent}
              </span>
              {match.heroesPlayed.length > 0 && (
                <div className="flex shrink-0 items-center gap-1">
                  {match.heroesPlayed.slice(0, 4).map((hero) => (
                    <Image
                      key={hero}
                      src={`/heroes/${toHero(hero)}.png`}
                      alt={hero}
                      width={20}
                      height={20}
                      className="rounded"
                      title={hero}
                    />
                  ))}
                  {match.heroesPlayed.length > 4 && (
                    <Badge variant="outline" className="px-1 py-0 text-[9px]">
                      +{match.heroesPlayed.length - 4}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}
