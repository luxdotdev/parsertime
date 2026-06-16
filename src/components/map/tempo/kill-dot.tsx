"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toHero, toTimestamp } from "@/lib/utils";
import Image from "next/image";
import { memo } from "react";

type KillDotProps = {
  x: number;
  y: number;
  attackerHero: string;
  attackerName: string;
  victimHero: string;
  victimName: string;
  teamLabel: string;
  color: string;
  time: number;
};

function KillDotImpl({
  x,
  y,
  attackerHero,
  attackerName,
  victimHero,
  victimName,
  teamLabel,
  color,
  time,
}: KillDotProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g
          role="img"
          aria-label={`${attackerName} eliminated ${victimName} at ${toTimestamp(time)}`}
          className="cursor-pointer"
        >
          {/* Touch target */}
          <circle cx={x} cy={y} r={10} fill="transparent" />
          {/* Visible dot */}
          <circle
            cx={x}
            cy={y}
            r={3.5}
            fill={color}
            stroke="var(--background)"
            strokeWidth={1}
          />
        </g>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <div className="flex items-center gap-1.5">
          <Image
            src={`/heroes/${toHero(attackerHero)}.png`}
            alt={attackerHero}
            width={64}
            height={64}
            className="h-5 w-5 rounded-sm"
          />
          <span className="font-medium">{attackerName}</span>
          <span className="text-muted-foreground">&rarr;</span>
          <Image
            src={`/heroes/${toHero(victimHero)}.png`}
            alt={victimHero}
            width={64}
            height={64}
            className="h-5 w-5 rounded-sm"
          />
          <span className="font-medium">{victimName}</span>
        </div>
        <p className="text-muted-foreground">
          {teamLabel} &middot;{" "}
          <span className="font-mono tabular-nums">{toTimestamp(time)}</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export const KillDot = memo(KillDotImpl);
