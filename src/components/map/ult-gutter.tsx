"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UltimateSpan } from "@/data/killfeed-dto";
import { toHero, toTimestamp } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";

const LANE_WIDTH = 32;
const BASE_PADDING = 10;
const MIN_BRACKET_HEIGHT = 36;
const FILL_WIDTH = 20;
const LABEL_OFFSET = 14;
const LABEL_CONTENT_WIDTH = 90;
const MIN_LABEL_GAP_PX = 52;

function fade(color: string, percent: number): string {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}

function spanLeft(depth: number, depthOffset: number): number {
  return BASE_PADDING + (depthOffset + depth) * LANE_WIDTH;
}

function spanLabelLeft(depth: number, depthOffset: number): number {
  return spanLeft(depth, depthOffset) + LABEL_OFFSET;
}

export function getGutterWidth(spans: UltimateSpan[]): number {
  if (spans.length === 0) return 0;
  const maxDepth = Math.max(0, ...spans.map((s) => s.depth));
  return spanLabelLeft(maxDepth, 0) + LABEL_CONTENT_WIDTH;
}

function computeLabelPositions(
  spans: UltimateSpan[],
  timeMin: number,
  timeRange: number,
  spanPositions?: Map<number, { startPercent: number; endPercent: number }>,
  containerHeight?: number
): Map<number, number> {
  const minGapPercent = containerHeight
    ? (MIN_LABEL_GAP_PX / containerHeight) * 100
    : 4.5;
  const sorted = [...spans].sort((a, b) => a.startTime - b.startTime);
  const positions = new Map<number, number>();
  let prevTop = -Infinity;

  for (const span of sorted) {
    const rawTop =
      spanPositions?.get(span.id)?.startPercent ??
      ((span.startTime - timeMin) / timeRange) * 100;
    const adjusted = Math.max(rawTop, prevTop + minGapPercent);
    positions.set(span.id, adjusted);
    prevTop = adjusted;
  }

  return positions;
}

function SpanTooltipContent({
  span,
  t,
}: {
  span: UltimateSpan;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium">
        {span.playerName} — {span.playerHero}
      </span>
      <span className="text-xs opacity-80">
        {t("tooltipTeam", { team: span.playerTeam })}
      </span>
      {span.isInstant ? (
        <span className="text-xs opacity-80">
          {t("tooltipTimestamp", { time: toTimestamp(span.startTime) })}
        </span>
      ) : (
        <>
          <span className="text-xs opacity-80">
            {t("ultTime", {
              start: toTimestamp(span.startTime),
              end: toTimestamp(span.endTime),
            })}
          </span>
          <span className="text-xs opacity-80">
            {t("tooltipDuration", { duration: span.duration.toFixed(1) })}
          </span>
        </>
      )}
      {span.killsDuringUlt.length > 0 && (
        <span className="text-xs">
          {t("ultKills", { count: span.killsDuringUlt.length })}
        </span>
      )}
      {span.deathsDuringUlt.length > 0 && (
        <span className="text-xs">
          {t("ultDeaths", { count: span.deathsDuringUlt.length })}
        </span>
      )}
      {span.diedDuringUlt && (
        <span className="text-destructive text-xs">
          {t("diedDuringUlt", { player: span.playerName })}
        </span>
      )}
    </div>
  );
}

type UltBracketGutterProps = {
  spans: UltimateSpan[];
  timeMin: number;
  timeMax: number;
  team1: string;
  team1Color: string;
  team2Color: string;
  showLabels: boolean;
  spanPositions?: Map<number, { startPercent: number; endPercent: number }>;
  containerHeight?: number;
  gutterWidth?: number;
};

export function UltBracketGutter({
  spans,
  timeMin,
  timeMax,
  team1,
  team1Color,
  team2Color,
  showLabels,
  spanPositions,
  containerHeight,
  gutterWidth,
}: UltBracketGutterProps) {
  const t = useTranslations("mapPage.killfeedUlt");
  const timeRange = timeMax - timeMin || 1;

  const labelPositions = showLabels
    ? computeLabelPositions(
        spans,
        timeMin,
        timeRange,
        spanPositions,
        containerHeight
      )
    : null;

  const localMaxDepth = Math.max(0, ...spans.map((s) => s.depth));
  const globalMaxDepth = gutterWidth
    ? Math.round(
        (gutterWidth - BASE_PADDING - LABEL_OFFSET - LABEL_CONTENT_WIDTH) /
          LANE_WIDTH
      )
    : localMaxDepth;
  const depthOffset = globalMaxDepth - localMaxDepth;

  return (
    <div className="relative h-full">
      {spans.map((span) => {
        const color = span.playerTeam === team1 ? team1Color : team2Color;
        const left = spanLeft(span.depth, depthOffset);
        const isDeath = span.diedDuringUlt;

        const override = spanPositions?.get(span.id);
        const topPercent = override
          ? override.startPercent
          : ((span.startTime - timeMin) / timeRange) * 100;
        const heightPercent = override
          ? override.endPercent - override.startPercent
          : (span.duration / timeRange) * 100;

        if (span.isInstant) {
          return (
            <div
              key={span.id}
              className="absolute"
              style={{ left: 0, right: 0, top: `${topPercent}%`, height: 0 }}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="absolute z-10 cursor-default"
                    style={{
                      left: left - 6,
                      top: -6,
                      width: 12,
                      height: 12,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    tabIndex={0}
                    role="img"
                    aria-label={t("instantUlt", {
                      player: span.playerName,
                      hero: span.playerHero,
                    })}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: color,
                        transform: "rotate(45deg)",
                      }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <SpanTooltipContent span={span} t={t} />
                </TooltipContent>
              </Tooltip>
            </div>
          );
        }

        return (
          <div
            key={span.id}
            className="absolute"
            style={{
              left: 0,
              right: 0,
              top: `${topPercent}%`,
              height: `${heightPercent}%`,
              minHeight: MIN_BRACKET_HEIGHT,
            }}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <div
                  className="absolute cursor-default"
                  style={{
                    left,
                    top: 0,
                    bottom: 0,
                    width: 2 + FILL_WIDTH,
                  }}
                  tabIndex={0}
                  role="img"
                  aria-label={t("ultLabel", {
                    player: span.playerName,
                    hero: span.playerHero,
                    duration: span.duration.toFixed(1),
                    kills: span.killsDuringUlt.length,
                  })}
                >
                  <div
                    className="absolute"
                    style={{
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 2,
                      backgroundColor: color,
                    }}
                  />
                  <div
                    className="absolute"
                    style={{
                      left: 2,
                      top: 0,
                      bottom: 0,
                      width: FILL_WIDTH,
                      background: `linear-gradient(to right, ${fade(color, 20)}, transparent)`,
                    }}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <SpanTooltipContent span={span} t={t} />
              </TooltipContent>
            </Tooltip>

            <div
              className="absolute"
              style={{
                left,
                top: 0,
                width: 8,
                height: 2,
                backgroundColor: color,
              }}
            />
            {!isDeath && (
              <div
                className="absolute"
                style={{
                  left,
                  bottom: 0,
                  width: 8,
                  height: 2,
                  backgroundColor: color,
                }}
              />
            )}

            {isDeath && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className="text-destructive focus-visible:ring-ring absolute z-10 rounded-sm focus:outline-none focus-visible:ring-1"
                    style={{
                      left: left + 1,
                      bottom: 0,
                      fontSize: "12px",
                      lineHeight: 1,
                      transform: "translate(-50%, 50%)",
                    }}
                    tabIndex={0}
                    role="img"
                    aria-label={t("diedDuringUlt", {
                      player: span.playerName,
                    })}
                  >
                    &#x2716;
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  {t("diedDuringUlt", { player: span.playerName })}
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        );
      })}

      {showLabels &&
        labelPositions &&
        spans.map((span) => {
          const color = span.playerTeam === team1 ? team1Color : team2Color;
          const adjustedTop = labelPositions.get(span.id) ?? 0;

          return (
            <GutterLabel
              key={`label-${span.id}`}
              span={span}
              color={color}
              left={spanLabelLeft(span.depth, depthOffset)}
              topPercent={adjustedTop}
              t={t}
            />
          );
        })}
    </div>
  );
}

function GutterLabel({
  span,
  color,
  left,
  topPercent,
  t,
}: {
  span: UltimateSpan;
  color: string;
  left: number;
  topPercent: number;
  t: ReturnType<typeof useTranslations>;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="focus-visible:ring-ring absolute z-10 flex items-center gap-1.5 rounded-sm focus:outline-none focus-visible:ring-1"
          style={{
            left,
            top: `${topPercent}%`,
            transform: "translateY(-50%)",
            whiteSpace: "nowrap",
          }}
          tabIndex={0}
          role="img"
          aria-label={
            span.isInstant
              ? t("instantUlt", {
                  player: span.playerName,
                  hero: span.playerHero,
                })
              : t("ultLabel", {
                  player: span.playerName,
                  hero: span.playerHero,
                  duration: span.duration.toFixed(1),
                  kills: span.killsDuringUlt.length,
                })
          }
        >
          <Image
            src={`/heroes/${toHero(span.playerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-7 w-7 rounded"
            style={{ border: `2px solid ${color}` }}
          />
          <span className="text-sm leading-none font-medium" style={{ color }}>
            {span.playerName}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        <SpanTooltipContent span={span} t={t} />
      </TooltipContent>
    </Tooltip>
  );
}
