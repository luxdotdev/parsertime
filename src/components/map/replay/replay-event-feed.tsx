"use client";

import type { DisplayEvent } from "@/data/replay-dto";
import { toHero, toTimestamp } from "@/lib/utils";
import Image from "next/image";
import { useEffect, useMemo, useRef } from "react";

type ReplayEventFeedProps = {
  displayEvents: DisplayEvent[];
  currentTime: number;
  team1Name: string;
  team1Color: string;
  team2Color: string;
};

const EVENT_WINDOW_BEFORE = 5;
const EVENT_WINDOW_AFTER = 2;

function eventKey(event: DisplayEvent): string {
  switch (event.type) {
    case "kill":
      return `kill-${event.t}-${event.attackerName}-${event.victimName}`;
    case "ult_start":
    case "ult_end":
    case "ult_charged":
      return `${event.type}-${event.t}-${event.playerName}-${event.ultimateId}`;
    case "hero_swap":
      return `swap-${event.t}-${event.playerName}-${event.playerHero}`;
    case "round_start":
    case "round_end":
      return `${event.type}-${event.roundNumber}`;
  }
}

export function ReplayEventFeed({
  displayEvents,
  currentTime,
  team1Name,
  team1Color,
  team2Color,
}: ReplayEventFeedProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  // Filter events within the visible window
  const visibleEvents = useMemo(() => {
    return displayEvents.filter(
      (e) =>
        e.t >= currentTime - EVENT_WINDOW_BEFORE &&
        e.t <= currentTime + EVENT_WINDOW_AFTER
    );
  }, [displayEvents, currentTime]);

  // Auto-scroll to keep the current event visible
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      activeRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [currentTime]);

  function getTeamColor(teamName: string) {
    return teamName === team1Name ? team1Color : team2Color;
  }

  return (
    <div className="bg-card flex h-[500px] flex-col rounded-lg border">
      <div className="border-b px-3 py-2">
        <h3 className="text-sm font-medium">Events</h3>
      </div>
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {visibleEvents.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-muted-foreground text-xs">No events nearby</p>
          </div>
        ) : (
          <div className="space-y-0.5 p-2">
            {visibleEvents.map((event) => {
              const isPast = event.t <= currentTime;
              const isCurrent = Math.abs(event.t - currentTime) < 0.5;

              return (
                <div
                  key={eventKey(event)}
                  ref={isCurrent ? activeRef : undefined}
                  className={`rounded px-2 py-1.5 text-xs transition-opacity ${
                    isCurrent
                      ? "bg-accent"
                      : isPast
                        ? "opacity-100"
                        : "opacity-40"
                  }`}
                >
                  <EventRow event={event} getTeamColor={getTeamColor} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EventRow({
  event,
  getTeamColor,
}: {
  event: DisplayEvent;
  getTeamColor: (team: string) => string;
}) {
  const timeStr = toTimestamp(event.t);

  switch (event.type) {
    case "kill":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">{timeStr}</span>
          <Image
            src={`/heroes/${toHero(event.attackerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-4 w-4 shrink-0 rounded-full border"
            style={{ borderColor: getTeamColor(event.attackerTeam) }}
          />
          <span
            className="truncate font-medium"
            style={{ color: getTeamColor(event.attackerTeam) }}
          >
            {event.attackerName}
          </span>
          <span className="text-muted-foreground shrink-0">&rarr;</span>
          <Image
            src={`/heroes/${toHero(event.victimHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-4 w-4 shrink-0 rounded-full border grayscale"
            style={{ borderColor: getTeamColor(event.victimTeam) }}
          />
          <span
            className="truncate font-medium"
            style={{ color: getTeamColor(event.victimTeam) }}
          >
            {event.victimName}
          </span>
        </div>
      );

    case "ult_start":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">{timeStr}</span>
          <Image
            src={`/heroes/${toHero(event.playerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-4 w-4 shrink-0 rounded-full border"
            style={{ borderColor: getTeamColor(event.playerTeam) }}
          />
          <span
            className="truncate font-medium"
            style={{ color: getTeamColor(event.playerTeam) }}
          >
            {event.playerName}
          </span>
          <span className="text-yellow-500">ult activated</span>
        </div>
      );

    case "ult_end":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">{timeStr}</span>
          <Image
            src={`/heroes/${toHero(event.playerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-4 w-4 shrink-0 rounded-full border"
            style={{ borderColor: getTeamColor(event.playerTeam) }}
          />
          <span
            className="truncate font-medium"
            style={{ color: getTeamColor(event.playerTeam) }}
          >
            {event.playerName}
          </span>
          <span className="text-muted-foreground">ult ended</span>
        </div>
      );

    case "hero_swap":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">{timeStr}</span>
          <Image
            src={`/heroes/${toHero(event.previousHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-4 w-4 shrink-0 rounded-full border grayscale"
            style={{ borderColor: getTeamColor(event.playerTeam) }}
          />
          <span className="text-muted-foreground">&rarr;</span>
          <Image
            src={`/heroes/${toHero(event.playerHero)}.png`}
            alt=""
            width={64}
            height={64}
            className="h-4 w-4 shrink-0 rounded-full border"
            style={{ borderColor: getTeamColor(event.playerTeam) }}
          />
          <span
            className="truncate font-medium"
            style={{ color: getTeamColor(event.playerTeam) }}
          >
            {event.playerName}
          </span>
        </div>
      );

    case "round_start":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">{timeStr}</span>
          <span className="font-medium text-yellow-500">
            Round {event.roundNumber} Start
          </span>
        </div>
      );

    case "round_end":
      return (
        <div className="flex items-center gap-1.5">
          <span className="text-muted-foreground shrink-0">{timeStr}</span>
          <span className="text-muted-foreground font-medium">
            Round {event.roundNumber} End
          </span>
        </div>
      );
  }
}
