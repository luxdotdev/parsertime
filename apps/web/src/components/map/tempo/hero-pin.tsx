"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toHero, toTimestamp } from "@/lib/utils";
import { memo } from "react";

type HeroPinProps = {
  x: number;
  y: number;
  hero: string;
  playerName: string;
  teamLabel: string;
  color: string;
  time: number;
  id: string;
  yOffset?: number;
  curveY?: number;
};

function HeroPinImpl({
  x,
  y,
  hero,
  playerName,
  teamLabel,
  color,
  time,
  id,
  yOffset = 0,
  curveY,
}: HeroPinProps) {
  const pinY = y + yOffset;
  const heroSlug = toHero(hero);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <g
          role="img"
          aria-label={`${playerName} used ${hero} ultimate at ${toTimestamp(time)}`}
          className="@media(hover:hover):hover:brightness-110 cursor-pointer"
        >
          {/* Connector line if offset */}
          {yOffset !== 0 && curveY !== undefined && (
            <line
              x1={x}
              y1={curveY}
              x2={x}
              y2={pinY}
              stroke={color}
              strokeWidth={0.5}
              strokeDasharray="2,2"
              opacity={0.5}
            />
          )}

          {/* Pin shape */}
          <g transform={`translate(${x}, ${pinY})`}>
            {/* Touch target */}
            <rect
              x={-17}
              y={-40}
              width={34}
              height={44}
              fill="transparent"
              className="pointer-events-auto"
            />

            {/* Teardrop pin */}
            <path
              d="M0,0 C-6,-6 -11,-12 -11,-18 A11,11 0 1,1 11,-18 C11,-12 6,-6 0,0Z"
              fill={color}
              stroke="var(--background)"
              strokeWidth={1}
            />

            {/* Hero icon */}
            <clipPath id={`pin-clip-${id}`}>
              <circle cx={0} cy={-18} r={8} />
            </clipPath>
            <image
              href={`/heroes/${heroSlug}.png`}
              x={-8}
              y={-26}
              width={16}
              height={16}
              clipPath={`url(#pin-clip-${id})`}
              preserveAspectRatio="xMidYMid slice"
            />
          </g>
        </g>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs">
        <p className="font-medium">{playerName}</p>
        <p className="text-muted-foreground">
          {hero} &middot; {teamLabel} &middot;{" "}
          <span className="font-mono tabular-nums">{toTimestamp(time)}</span>
        </p>
      </TooltipContent>
    </Tooltip>
  );
}

export const HeroPin = memo(HeroPinImpl);
