"use client";

import { MapStatCell } from "@/components/map/map-stat-cell";
import { Separator } from "@/components/ui/separator";
import type {
  EventEntry,
  MapEventsData,
} from "@/lib/get-map-events";
import { toHero, toTimestamp } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useMemo, useState } from "react";

type FilterKey =
  | "all"
  | "highlights"
  | "ultimates"
  | "swaps"
  | "objectives";

type EventsTimelineProps = {
  data: MapEventsData;
  team1Color: string;
  team2Color: string;
};

const FILTER_ORDER: FilterKey[] = [
  "all",
  "highlights",
  "ultimates",
  "swaps",
  "objectives",
];

function matchesFilter(entry: EventEntry, filter: FilterKey): boolean {
  if (filter === "all") return true;
  switch (entry.kind) {
    case "round_start":
    case "round_end":
    case "match_start":
    case "match_end":
      return true;
    case "multikill":
    case "ajax":
      return filter === "highlights";
    case "ult_used":
    case "ult_kill":
      return filter === "ultimates" || filter === "highlights";
    case "swap":
      return filter === "swaps";
    case "objective_captured":
      return filter === "objectives";
  }
}

function isStructural(entry: EventEntry): boolean {
  return (
    entry.kind === "round_start" ||
    entry.kind === "round_end" ||
    entry.kind === "match_start" ||
    entry.kind === "match_end"
  );
}

function entryKey(entry: EventEntry): string {
  switch (entry.kind) {
    case "match_start":
    case "match_end":
      return `${entry.kind}-${entry.time}`;
    case "round_start":
    case "round_end":
      return `${entry.kind}-${entry.time}-${entry.round}`;
    case "objective_captured":
      return `${entry.kind}-${entry.time}-${entry.team}`;
    case "swap":
      return `${entry.kind}-${entry.time}-${entry.player}-${entry.toHero}`;
    case "ult_used":
    case "ult_kill":
    case "multikill":
    case "ajax":
      return `${entry.kind}-${entry.time}-${entry.player}`;
  }
}

export function EventsTimeline({
  data,
  team1Color,
  team2Color,
}: EventsTimelineProps) {
  const t = useTranslations("mapPage.events");
  const [filter, setFilter] = useState<FilterKey>("all");

  function teamColor(team: "team1" | "team2") {
    return team === "team1" ? team1Color : team2Color;
  }
  function teamName(team: "team1" | "team2") {
    return team === "team1" ? data.team1Name : data.team2Name;
  }

  const visibleEvents = useMemo(
    () => data.events.filter((e) => matchesFilter(e, filter)),
    [data.events, filter]
  );

  const visibleNonStructural = visibleEvents.filter((e) => !isStructural(e));

  const grouped = useMemo(() => {
    const groups: { round: number | null; entries: EventEntry[] }[] = [
      { round: null, entries: [] },
    ];
    let currentRound: number | null = null;
    for (const e of visibleEvents) {
      if (e.kind === "round_start") {
        currentRound = e.round;
        groups.push({ round: e.round, entries: [e] });
        continue;
      }
      groups[groups.length - 1].entries.push(e);
      if (e.kind === "round_end") {
        currentRound = null;
      }
    }
    void currentRound;
    return groups.filter((g) => g.entries.length > 0);
  }, [visibleEvents]);

  return (
    <section aria-label={t("mapEvents.title")} className="space-y-6">
      <div className="grid grid-cols-2 gap-x-6 gap-y-5 lg:grid-cols-5">
        <MapStatCell
          label={t("totals.rounds")}
          value={data.totals.rounds.toLocaleString()}
        />
        <MapStatCell
          label={t("totals.fights")}
          value={data.totals.fights.toLocaleString()}
        />
        <MapStatCell
          label={t("totals.multikills")}
          value={data.totals.multikills.toLocaleString()}
        />
        <MapStatCell
          label={t("totals.ultimates")}
          value={data.totals.ultsUsed.toLocaleString()}
        />
        <MapStatCell
          label={t("totals.swaps")}
          value={data.totals.swaps.toLocaleString()}
        />
      </div>

      <Separator />

      <div
        role="tablist"
        aria-label={t("filters.label")}
        className="flex flex-wrap gap-1.5"
      >
        {FILTER_ORDER.map((key) => {
          const active = filter === key;
          return (
            <button
              key={key}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setFilter(key)}
              className={
                active
                  ? "bg-primary text-primary-foreground rounded-md px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.06em] uppercase transition-colors"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60 rounded-md px-2.5 py-1 font-mono text-[0.6875rem] tracking-[0.06em] uppercase transition-colors"
              }
            >
              {t(`filters.${key}`)}
            </button>
          );
        })}
      </div>

      {visibleNonStructural.length === 0 ? (
        <p className="text-muted-foreground text-sm">{t("filters.empty")}</p>
      ) : (
        <ol className="space-y-6">
          {grouped.map((group) => (
            <li
              key={`${group.round ?? "pre"}-${group.entries[0]?.time ?? 0}`}
              className="space-y-2"
            >
              <RoundHeader entries={group.entries} t={t} />
              <ol className="divide-border/60 divide-y">
                {group.entries
                  .filter((e) => !isStructural(e) || e.kind === "round_end")
                  .map((entry) => (
                    <EventRow
                      key={entryKey(entry)}
                      entry={entry}
                      teamColor={teamColor}
                      teamName={teamName}
                      t={t}
                    />
                  ))}
              </ol>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function RoundHeader({
  entries,
  t,
}: {
  entries: EventEntry[];
  t: ReturnType<typeof useTranslations>;
}) {
  const start = entries.find(
    (e) => e.kind === "round_start" || e.kind === "match_start"
  );
  if (!start) return null;
  if (start.kind === "match_start") {
    return (
      <div className="flex items-baseline justify-between">
        <span className="text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
          {t("matchStart")}
        </span>
        <span className="text-muted-foreground font-mono text-xs tabular-nums">
          {toTimestamp(start.time)}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
        {t("round", { number: start.round })}
      </span>
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {toTimestamp(start.time)}
      </span>
    </div>
  );
}

const TYPE_LABEL_KEYS: Record<EventEntry["kind"], string> = {
  match_start: "type.matchStart",
  match_end: "type.matchEnd",
  round_start: "type.roundStart",
  round_end: "type.roundEnd",
  objective_captured: "type.objective",
  swap: "type.swap",
  ult_used: "type.ult",
  ult_kill: "type.ultKill",
  multikill: "type.multikill",
  ajax: "type.ajax",
};

function HeroPortrait({
  hero,
  borderColor,
  alt,
}: {
  hero: string;
  borderColor: string;
  alt: string;
}) {
  return (
    <Image
      src={`/heroes/${toHero(hero)}.png`}
      alt={alt}
      width={48}
      height={48}
      className="h-5 w-5 shrink-0 rounded border-[1.5px]"
      style={{ borderColor }}
    />
  );
}

function EventRow({
  entry,
  teamColor,
  teamName,
  t,
}: {
  entry: EventEntry;
  teamColor: (team: "team1" | "team2") => string;
  teamName: (team: "team1" | "team2") => string;
  t: ReturnType<typeof useTranslations>;
}) {
  const label = t(TYPE_LABEL_KEYS[entry.kind]);
  const isHighlight = entry.kind === "multikill" || entry.kind === "ajax";

  return (
    <li className="grid grid-cols-[5rem_6.5rem_1fr] items-center gap-3 py-2">
      <span className="text-muted-foreground font-mono text-xs tabular-nums">
        {toTimestamp(entry.time)}
      </span>
      <span
        className={
          isHighlight
            ? "text-primary font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
            : "text-muted-foreground font-mono text-[0.6875rem] tracking-[0.06em] uppercase"
        }
      >
        {label}
      </span>
      <div className="text-sm">
        <EventDetail entry={entry} teamColor={teamColor} teamName={teamName} t={t} />
      </div>
    </li>
  );
}

function EventDetail({
  entry,
  teamColor,
  teamName,
  t,
}: {
  entry: EventEntry;
  teamColor: (team: "team1" | "team2") => string;
  teamName: (team: "team1" | "team2") => string;
  t: ReturnType<typeof useTranslations>;
}) {
  switch (entry.kind) {
    case "match_start":
      return <span>{t("detail.matchStart")}</span>;
    case "match_end":
      return <span>{t("detail.matchEnd")}</span>;
    case "round_start":
      return (
        <span className="text-muted-foreground">
          {t("detail.roundStart", { number: entry.round })}
        </span>
      );
    case "round_end":
      return (
        <span className="text-muted-foreground">
          {t("detail.roundEnd", { number: entry.round })}
        </span>
      );
    case "objective_captured":
      return (
        <span>
          {t.rich(entry.isPointTake ? "detail.pointTake" : "detail.capture", {
            color: (chunks) => (
              <span style={{ color: teamColor(entry.team) }}>{chunks}</span>
            ),
            team: teamName(entry.team),
          })}
        </span>
      );
    case "swap":
      return (
        <div className="flex items-center gap-2">
          <HeroPortrait
            hero={entry.fromHero}
            borderColor={teamColor(entry.team)}
            alt={entry.fromHero}
          />
          <span style={{ color: teamColor(entry.team) }} className="font-medium">
            {entry.player}
          </span>
          <span className="text-muted-foreground font-mono text-xs">→</span>
          <HeroPortrait
            hero={entry.toHero}
            borderColor={teamColor(entry.team)}
            alt={entry.toHero}
          />
        </div>
      );
    case "ult_used":
      return (
        <div className="flex items-center gap-2">
          <HeroPortrait
            hero={entry.hero}
            borderColor={teamColor(entry.team)}
            alt={entry.hero}
          />
          <span style={{ color: teamColor(entry.team) }} className="font-medium">
            {entry.player}
          </span>
          {entry.fight !== null ? (
            <span className="text-muted-foreground text-xs">
              {t("detail.fightTag", { number: entry.fight })}
            </span>
          ) : null}
        </div>
      );
    case "ult_kill":
      return (
        <div className="flex items-center gap-2">
          <HeroPortrait
            hero={entry.hero}
            borderColor={teamColor(entry.team)}
            alt={entry.hero}
          />
          <span>
            {t.rich("detail.ultKill", {
              count: entry.killCount,
              color: (chunks) => (
                <span
                  style={{ color: teamColor(entry.team) }}
                  className="font-medium"
                >
                  {chunks}
                </span>
              ),
              player: entry.player,
            })}
          </span>
        </div>
      );
    case "multikill":
      return (
        <div className="flex items-center gap-2">
          <HeroPortrait
            hero={entry.hero}
            borderColor={teamColor(entry.team)}
            alt={entry.hero}
          />
          <span>
            {t.rich("detail.multikill", {
              count: entry.killCount,
              fight: entry.fight,
              color: (chunks) => (
                <span
                  style={{ color: teamColor(entry.team) }}
                  className="font-medium"
                >
                  {chunks}
                </span>
              ),
              player: entry.player,
            })}
          </span>
        </div>
      );
    case "ajax":
      return (
        <div className="flex items-center gap-2">
          <HeroPortrait
            hero={entry.hero}
            borderColor={teamColor(entry.team)}
            alt={entry.hero}
          />
          <span>
            {t.rich("detail.ajax", {
              fight: entry.fight,
              color: (chunks) => (
                <span
                  style={{ color: teamColor(entry.team) }}
                  className="font-medium"
                >
                  {chunks}
                </span>
              ),
              player: entry.player,
            })}
          </span>
        </div>
      );
  }
}
