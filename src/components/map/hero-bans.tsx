"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { cn, toHero } from "@/lib/utils";
import type { HeroBan } from "@prisma/client";
import { Ban } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";

export function HeroBans({
  heroBans,
  team1Name,
}: {
  heroBans: HeroBan[];
  team1Name: string;
}) {
  const t = useTranslations("mapPage.heroBans");
  const { team1: team1Color, team2: team2Color } = useColorblindMode();

  if (heroBans.length === 0) {
    return null;
  }

  // Sort by ban position to ensure correct order
  const sortedBans = [...heroBans].sort(
    (a, b) => a.banPosition - b.banPosition
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex h-10 w-10 items-center justify-center rounded-full">
        <Ban className="h-8 w-8 text-red-600" />
      </div>
      <div className="flex gap-1">
        {sortedBans.map((ban) => (
          <div
            key={ban.id}
            className={cn("relative h-12 w-12 overflow-hidden rounded")}
            style={{
              border:
                ban.team === team1Name
                  ? `2px solid ${team1Color}`
                  : `2px solid ${team2Color}`,
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <Image
                  src={`/heroes/${toHero(ban.hero)}.png`}
                  alt={t("bannedBy", { hero: ban.hero, team: ban.team })}
                  width={48}
                  height={48}
                  className="h-full w-full object-cover"
                />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t("bannedBy", { hero: ban.hero, team: ban.team })}</p>
              </TooltipContent>
            </Tooltip>
            <div
              className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-sm text-xs font-bold text-white"
              style={{
                backgroundColor:
                  ban.team === team1Name ? team1Color : team2Color,
              }}
            >
              {ban.banPosition}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
