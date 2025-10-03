"use client";

import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CardIcon } from "@/components/ui/card-icon";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MVPScoreResult } from "@/lib/mvp-score";
import { toHero } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

type MVPCardProps = {
  playerName: string;
  mvpScores: MVPScoreResult[];
};

function formatStatName(stat: string): string {
  return stat
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function MVPCard({ playerName, mvpScores }: MVPCardProps) {
  const t = useTranslations("mapPage.player.analytics");

  const playerScore = mvpScores?.find((s) => s.playerName === playerName);

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("mvpScore.title")}
            </CardTitle>
            <CardIcon>
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </CardIcon>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {playerScore ? playerScore.totalScore.toFixed(2) : "—"} pts
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-muted-foreground text-xs">
              {t("mvpScore.footer")}
            </p>
          </CardFooter>
        </Card>
      </HoverCardTrigger>
      <HoverCardContent className="w-fit">
        {playerScore ? (
          <div className="space-y-2">
            <div className="border-b pb-2">
              <div className="text-sm font-semibold">
                {playerScore.playerName}
              </div>
              <div className="text-muted-foreground text-xs">
                {t("mvpScore.totalScore", {
                  score: playerScore.totalScore.toFixed(2),
                })}
              </div>
            </div>
            <ScrollArea className="max-h-72 overflow-y-auto border-b py-2">
              <div className="grid grid-cols-1 gap-2 pr-2 sm:grid-cols-2">
                {playerScore.contributions
                  .slice()
                  .sort(
                    (a, b) =>
                      Math.abs(b.pointsAwarded) - Math.abs(a.pointsAwarded)
                  )
                  .map((contribution) => (
                    <div
                      key={`${contribution.stat}-${contribution.hero}`}
                      className="space-y-0.5 text-xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 font-medium">
                          <Image
                            src={`/heroes/${toHero(contribution.hero)}.png`}
                            alt={`${contribution.hero} icon`}
                            width={256}
                            height={256}
                            className="h-4 w-4 rounded"
                          />
                          {formatStatName(contribution.stat)}
                          <span className="text-muted-foreground">
                            ({contribution.hero})
                          </span>
                        </span>
                        <span
                          className={
                            contribution.pointsAwarded === 0
                              ? "font-semibold text-gray-500"
                              : contribution.pointsAwarded > 0
                                ? "font-semibold text-green-500"
                                : "font-semibold text-red-500"
                          }
                        >
                          {contribution.pointsAwarded > 0 ? "+" : ""}
                          {contribution.pointsAwarded.toFixed(1)} pts
                        </span>
                      </div>
                      <div className="text-muted-foreground space-x-2 text-[10px]">
                        <span>
                          {t("mvpScore.per10Value", {
                            per10Value: contribution.per10Value.toFixed(1),
                            heroAverage: contribution.heroAverage.toFixed(1),
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {contribution.zScore > 0 ? "+" : ""}
                          {contribution.zScore.toFixed(2)}σ
                        </span>
                        <span>•</span>
                        <span>
                          {t("mvpScore.percentile", {
                            percentile: contribution.percentile.toFixed(0),
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">No data available</div>
        )}

        <p className="text-muted-foreground max-w-prose pt-2 text-xs">
          {t("mvpScore.explanation")}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
