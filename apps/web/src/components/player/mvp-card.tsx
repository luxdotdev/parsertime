"use client";

import { StatBlock } from "@/components/player/stat-panel";
import { CardIcon } from "@/components/ui/card-icon";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { MVPScoreResult } from "@/lib/mvp-score";
import { toHero } from "@/lib/utils";
import { useFormatter, useTranslations } from "next-intl";
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
  const format = useFormatter();

  const playerScore = mvpScores?.find((s) => s.playerName === playerName);
  function formatDecimal(value: number, digits: number) {
    return format.number(value, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  function formatSignedDecimal(value: number, digits: number) {
    return format.number(value, {
      signDisplay: "exceptZero",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <StatBlock
          className="hover:bg-muted/40 cursor-help transition-colors"
          label={t("mvpScore.title")}
          icon={
            <CardIcon>
              <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
              <path d="M5 3v4" />
              <path d="M19 17v4" />
              <path d="M3 5h4" />
              <path d="M17 19h4" />
            </CardIcon>
          }
          value={
            <>
              {playerScore ? formatDecimal(playerScore.totalScore, 2) : "—"}
              <span className="text-muted-foreground ml-1 text-base font-normal">
                {t("mvpScore.pointsUnit")}
              </span>
            </>
          }
          sub={t("mvpScore.footer")}
        />
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
                  score: formatDecimal(playerScore.totalScore, 2),
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
                            alt={t("mvpScore.heroIconAlt", {
                              hero: contribution.hero,
                            })}
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
                          {formatSignedDecimal(contribution.pointsAwarded, 1)}{" "}
                          {t("mvpScore.pointsUnit")}
                        </span>
                      </div>
                      <div className="text-muted-foreground space-x-2 text-[10px]">
                        <span>
                          {t("mvpScore.per10Value", {
                            per10Value: formatDecimal(
                              contribution.per10Value,
                              1
                            ),
                            heroAverage: formatDecimal(
                              contribution.heroAverage,
                              1
                            ),
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {t("mvpScore.zScore", {
                            score: formatSignedDecimal(contribution.zScore, 2),
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          {t("mvpScore.percentile", {
                            percentile: Math.round(contribution.percentile),
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </ScrollArea>
          </div>
        ) : (
          <div className="text-muted-foreground text-sm">
            {t("mvpScore.noData")}
          </div>
        )}

        <p className="text-muted-foreground max-w-prose pt-2 text-xs">
          {t("mvpScore.explanation")}
        </p>
      </HoverCardContent>
    </HoverCard>
  );
}
