"use client";

import {
  tempoPointsToSvgPath,
  type FightBoundary,
  type TempoDataPoint,
} from "@/data/map/types";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";

function SkipBackIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
    >
      <path d="M10.5 11L5.5 7L10.5 3V11Z" fill="currentColor" />
      <rect x="3" y="3" width="1.5" height="8" fill="currentColor" />
    </svg>
  );
}

function SkipForwardIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
    >
      <path d="M3.5 3L8.5 7L3.5 11V3Z" fill="currentColor" />
      <rect x="9.5" y="3" width="1.5" height="8" fill="currentColor" />
    </svg>
  );
}

function PrevIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
    >
      <path d="M9 11L4 7L9 3V11Z" fill="currentColor" />
    </svg>
  );
}

function NextIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={className}
    >
      <path d="M5 3L10 7L5 11V3Z" fill="currentColor" />
    </svg>
  );
}

type TempoScrubberProps = {
  matchStart: number;
  matchEnd: number;
  range: [number, number];
  onRangeChange: (range: [number, number]) => void;
  fightBoundaries: FightBoundary[];
  miniSeries: TempoDataPoint[];
};

const MIN_SELECTION_PCT = 5; // minimum selection width as % of total

function snapToFight(
  time: number,
  fights: FightBoundary[],
  threshold = 10
): number {
  let closest = time;
  let minDist = threshold;
  for (const f of fights) {
    for (const edge of [f.start, f.end]) {
      const dist = Math.abs(time - edge);
      if (dist < minDist) {
        minDist = dist;
        closest = edge;
      }
    }
  }
  return closest;
}

type DragTarget = "left" | "right" | "center" | null;

export function TempoScrubber({
  matchStart,
  matchEnd,
  range,
  onRangeChange,
  fightBoundaries,
  miniSeries,
}: TempoScrubberProps) {
  const t = useTranslations("mapPage.events.tempo");
  const [snapEnabled, setSnapEnabled] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{
    target: DragTarget;
    startX: number;
    startRange: [number, number];
  } | null>(null);

  const duration = matchEnd - matchStart;
  const leftPct = ((range[0] - matchStart) / duration) * 100;
  const rightPct = ((range[1] - matchStart) / duration) * 100;

  const pctToTime = useCallback(
    (pct: number) => matchStart + (pct / 100) * duration,
    [matchStart, duration]
  );

  const xToPct = useCallback((clientX: number) => {
    const el = containerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(
      0,
      Math.min(100, ((clientX - rect.left) / rect.width) * 100)
    );
  }, []);

  const commitSnap = useCallback(
    (newRange: [number, number]) => {
      if (snapEnabled) {
        onRangeChange([
          snapToFight(newRange[0], fightBoundaries),
          snapToFight(newRange[1], fightBoundaries),
        ]);
      }
    },
    [snapEnabled, fightBoundaries, onRangeChange]
  );

  const handlePointerDown = useCallback(
    (target: DragTarget) => (e: React.PointerEvent) => {
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragRef.current = {
        target,
        startX: e.clientX,
        startRange: [...range],
      };
    },
    [range]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;

      const currentPct = xToPct(e.clientX);

      if (drag.target === "left") {
        const newLeft = Math.min(currentPct, rightPct - MIN_SELECTION_PCT);
        onRangeChange([pctToTime(Math.max(0, newLeft)), range[1]]);
      } else if (drag.target === "right") {
        const newRight = Math.max(currentPct, leftPct + MIN_SELECTION_PCT);
        onRangeChange([range[0], pctToTime(Math.min(100, newRight))]);
      } else if (drag.target === "center") {
        const el = containerRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const deltaPx = e.clientX - drag.startX;
        const deltaPct = (deltaPx / rect.width) * 100;
        const origLeftPct =
          ((drag.startRange[0] - matchStart) / duration) * 100;
        const origRightPct =
          ((drag.startRange[1] - matchStart) / duration) * 100;
        const width = origRightPct - origLeftPct;

        let newLeft = origLeftPct + deltaPct;
        let newRight = origRightPct + deltaPct;

        if (newLeft < 0) {
          newLeft = 0;
          newRight = width;
        }
        if (newRight > 100) {
          newRight = 100;
          newLeft = 100 - width;
        }

        onRangeChange([pctToTime(newLeft), pctToTime(newRight)]);
      }
    },
    [
      xToPct,
      pctToTime,
      onRangeChange,
      range,
      leftPct,
      rightPct,
      matchStart,
      duration,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (dragRef.current) {
      commitSnap(range);
      dragRef.current = null;
    }
  }, [commitSnap, range]);

  const handleReset = useCallback(() => {
    onRangeChange([matchStart, matchEnd]);
  }, [matchStart, matchEnd, onRangeChange]);

  const miniWidth = 1000;
  const miniHeight = 48;
  const { miniPoints1, miniPoints2 } = useMemo(() => {
    const pts1: { x: number; y: number }[] = [];
    const pts2: { x: number; y: number }[] = [];
    let max = 0;
    for (const p of miniSeries) {
      max = Math.max(max, p.team1, p.team2);
    }
    if (max === 0) max = 1;

    for (const p of miniSeries) {
      const x = ((p.time - matchStart) / duration) * miniWidth;
      pts1.push({
        x,
        y: miniHeight / 2 - (p.team1 / max) * (miniHeight / 2 - 2),
      });
      pts2.push({
        x,
        y: miniHeight / 2 + (p.team2 / max) * (miniHeight / 2 - 2),
      });
    }
    return { miniPoints1: pts1, miniPoints2: pts2 };
  }, [miniSeries, matchStart, duration]);

  const isFullRange =
    Math.abs(range[0] - matchStart) < 0.5 &&
    Math.abs(range[1] - matchEnd) < 0.5;

  const currentFightIndex = useMemo(() => {
    if (fightBoundaries.length === 0) return -1;
    const TOLERANCE = 2; // seconds
    return fightBoundaries.findIndex(
      (f) =>
        Math.abs(range[0] - f.start) < TOLERANCE &&
        Math.abs(range[1] - f.end) < TOLERANCE
    );
  }, [range, fightBoundaries]);

  const goToFight = useCallback(
    (index: number) => {
      const fight = fightBoundaries[index];
      if (fight) {
        const padding = Math.max(3, (fight.end - fight.start) * 0.15);
        onRangeChange([
          Math.max(matchStart, fight.start - padding),
          Math.min(matchEnd, fight.end + padding),
        ]);
      }
    },
    [fightBoundaries, onRangeChange, matchStart, matchEnd]
  );

  const goToPrevFight = useCallback(() => {
    if (fightBoundaries.length === 0) return;
    if (currentFightIndex > 0) {
      goToFight(currentFightIndex - 1);
    } else if (currentFightIndex === -1) {
      const rangeCenter = (range[0] + range[1]) / 2;
      let best = fightBoundaries.length - 1;
      for (let i = fightBoundaries.length - 1; i >= 0; i--) {
        const fightCenter =
          (fightBoundaries[i].start + fightBoundaries[i].end) / 2;
        if (fightCenter < rangeCenter) {
          best = i;
          break;
        }
      }
      goToFight(best);
    }
  }, [fightBoundaries, currentFightIndex, goToFight, range]);

  const goToNextFight = useCallback(() => {
    if (fightBoundaries.length === 0) return;
    if (
      currentFightIndex >= 0 &&
      currentFightIndex < fightBoundaries.length - 1
    ) {
      goToFight(currentFightIndex + 1);
    } else if (currentFightIndex === -1) {
      const rangeCenter = (range[0] + range[1]) / 2;
      let best = 0;
      for (let i = 0; i < fightBoundaries.length; i++) {
        const fightCenter =
          (fightBoundaries[i].start + fightBoundaries[i].end) / 2;
        if (fightCenter > rangeCenter) {
          best = i;
          break;
        }
      }
      goToFight(best);
    }
  }, [fightBoundaries, currentFightIndex, goToFight, range]);

  const transportBtnClass =
    "flex items-center justify-center rounded-md p-1 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30";

  return (
    <div className="space-y-2">
      {/* Scrubber track */}
      <div
        ref={containerRef}
        className="relative h-12 w-full overflow-hidden rounded-lg bg-zinc-900 select-none dark:bg-zinc-950"
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        aria-label={t("adjustRange")}
      >
        {/* Mini chart background */}
        <svg
          viewBox={`0 0 ${miniWidth} ${miniHeight}`}
          preserveAspectRatio="none"
          className="absolute inset-0 h-full w-full"
        >
          {miniPoints1.length > 1 && (
            <path
              d={tempoPointsToSvgPath(miniPoints1)}
              fill="none"
              stroke="white"
              strokeWidth={1}
              opacity={0.2}
            />
          )}
          {miniPoints2.length > 1 && (
            <path
              d={tempoPointsToSvgPath(miniPoints2)}
              fill="none"
              stroke="white"
              strokeWidth={1}
              opacity={0.2}
            />
          )}

          {fightBoundaries.map((fb) => {
            const x1 = ((fb.start - matchStart) / duration) * miniWidth;
            const x2 = ((fb.end - matchStart) / duration) * miniWidth;
            return (
              <g key={fb.fightNumber}>
                <line
                  x1={x1}
                  y1={0}
                  x2={x1}
                  y2={miniHeight}
                  stroke="white"
                  strokeWidth={0.5}
                  opacity={0.1}
                />
                <line
                  x1={x2}
                  y1={0}
                  x2={x2}
                  y2={miniHeight}
                  stroke="white"
                  strokeWidth={0.5}
                  opacity={0.1}
                />
              </g>
            );
          })}
        </svg>

        {/* Dim left region */}
        <div
          className="pointer-events-none absolute inset-y-0 left-0 bg-black/50"
          style={{ width: `${leftPct}%` }}
        />

        {/* Dim right region */}
        <div
          className="pointer-events-none absolute inset-y-0 right-0 bg-black/50"
          style={{ width: `${100 - rightPct}%` }}
        />

        {/* Selection frame */}
        <div
          className="absolute inset-y-0"
          style={{
            left: `${leftPct}%`,
            right: `${100 - rightPct}%`,
          }}
        >
          {/* Top & bottom borders */}
          <div className="bg-primary absolute inset-x-0 top-0 h-[3px]" />
          <div className="bg-primary absolute inset-x-0 bottom-0 h-[3px]" />

          {/* Center drag area */}
          <div
            className="absolute inset-0 cursor-grab active:cursor-grabbing"
            onPointerDown={handlePointerDown("center")}
          />

          {/* Left handle */}
          <div
            className="bg-primary focus-visible:ring-ring absolute inset-y-0 -left-px flex w-4 cursor-ew-resize items-center justify-center rounded-l-md focus-visible:ring-2 focus-visible:outline-none"
            onPointerDown={handlePointerDown("left")}
            tabIndex={0}
            role="slider"
            aria-label="Selection start"
            aria-valuemin={matchStart}
            aria-valuemax={matchEnd}
            aria-valuenow={range[0]}
          >
            <svg
              width="6"
              height="20"
              viewBox="0 0 6 20"
              className="text-primary-foreground/70"
            >
              <line
                x1="2"
                y1="4"
                x2="2"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="4.5"
                y1="4"
                x2="4.5"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Right handle */}
          <div
            className="bg-primary focus-visible:ring-ring absolute inset-y-0 -right-px flex w-4 cursor-ew-resize items-center justify-center rounded-r-md focus-visible:ring-2 focus-visible:outline-none"
            onPointerDown={handlePointerDown("right")}
            tabIndex={0}
            role="slider"
            aria-label="Selection end"
            aria-valuemin={matchStart}
            aria-valuemax={matchEnd}
            aria-valuenow={range[1]}
          >
            <svg
              width="6"
              height="20"
              viewBox="0 0 6 20"
              className="text-primary-foreground/70"
            >
              <line
                x1="1.5"
                y1="4"
                x2="1.5"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <line
                x1="4"
                y1="4"
                x2="4"
                y2="16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
        </div>
      </div>

      {/* Transport controls */}
      <div className="text-muted-foreground flex items-center justify-between text-xs">
        {/* Left: snap toggle */}
        <button
          type="button"
          onClick={() => setSnapEnabled(!snapEnabled)}
          className={cn(
            "focus-visible:ring-ring rounded-md px-2 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none",
            snapEnabled ? "bg-primary/10 text-primary" : "hover:bg-muted"
          )}
        >
          {t("snapToFights")}
        </button>

        {/* Center: fight transport */}
        {fightBoundaries.length > 0 && (
          <div className="flex items-center gap-0.5">
            {/* Skip to start / show all */}
            <button
              type="button"
              onClick={handleReset}
              disabled={isFullRange}
              className={transportBtnClass}
              aria-label={t("allFights")}
              title={t("allFights")}
            >
              <SkipBackIcon />
            </button>

            {/* Previous fight */}
            <button
              type="button"
              onClick={goToPrevFight}
              disabled={currentFightIndex === 0}
              className={transportBtnClass}
              aria-label="Previous fight"
            >
              <PrevIcon />
            </button>

            {/* Current fight label */}
            <span className="min-w-[4.5rem] px-1 text-center font-mono tabular-nums">
              {currentFightIndex >= 0
                ? t("fightLabel", { number: currentFightIndex + 1 })
                : isFullRange
                  ? t("allFights")
                  : "—"}
            </span>

            {/* Next fight */}
            <button
              type="button"
              onClick={goToNextFight}
              disabled={currentFightIndex === fightBoundaries.length - 1}
              className={transportBtnClass}
              aria-label="Next fight"
            >
              <NextIcon />
            </button>

            {/* Skip to end / show all */}
            <button
              type="button"
              onClick={handleReset}
              disabled={isFullRange}
              className={transportBtnClass}
              aria-label={t("allFights")}
              title={t("allFights")}
            >
              <SkipForwardIcon />
            </button>
          </div>
        )}

        {/* Right: spacer for alignment */}
        <div className="w-[4.5rem]" />
      </div>
    </div>
  );
}
