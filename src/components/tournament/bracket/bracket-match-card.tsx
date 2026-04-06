"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TournamentMatchStatus } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";

type TeamSlot = {
  id: number;
  name: string;
  seed: number;
} | null;

export type BracketMatchData = {
  id: number;
  tournamentId: number;
  bracketPosition: number;
  status: TournamentMatchStatus;
  team1: TeamSlot;
  team2: TeamSlot;
  team1Score: number;
  team2Score: number;
  winnerId: number | null;
};

export function BracketMatchCard({ match }: { match: BracketMatchData }) {
  const isCompleted = match.status === "COMPLETED";
  const isOngoing = match.status === "ONGOING";

  return (
    <Link
      href={`/tournaments/${match.tournamentId}/match/${match.id}` as Route}
    >
      <Card
        className={cn(
          "flex h-full cursor-pointer flex-col gap-0 overflow-hidden py-0 transition-all hover:shadow-md",
          isOngoing && "border-primary",
          isCompleted && "border-border"
        )}
      >
        <TeamRow
          team={match.team1}
          score={match.team1Score}
          isWinner={isCompleted && match.winnerId === match.team1?.id}
          isLoser={
            isCompleted &&
            match.winnerId !== null &&
            match.winnerId !== match.team1?.id
          }
          status={match.status}
        />
        <div className="border-t" />
        <TeamRow
          team={match.team2}
          score={match.team2Score}
          isWinner={isCompleted && match.winnerId === match.team2?.id}
          isLoser={
            isCompleted &&
            match.winnerId !== null &&
            match.winnerId !== match.team2?.id
          }
          status={match.status}
        />
        {isOngoing && (
          <div className="flex items-center justify-center border-t px-3 py-1">
            <span className="bg-primary mr-1.5 inline-block size-2 animate-pulse rounded-full" />
            <span className="text-muted-foreground text-xs">Live</span>
          </div>
        )}
      </Card>
    </Link>
  );
}

function TeamRow({
  team,
  score,
  isWinner,
  isLoser,
  status,
}: {
  team: TeamSlot;
  score: number;
  isWinner: boolean;
  isLoser: boolean;
  status: TournamentMatchStatus;
}) {
  return (
    <div
      className={cn(
        "flex flex-1 items-center justify-between px-3 py-2",
        isWinner && "bg-emerald-500/10",
        isLoser && "opacity-50"
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        {team && (
          <span className="text-muted-foreground text-xs tabular-nums">
            {team.seed}
          </span>
        )}
        <span
          className={cn(
            "truncate text-sm font-medium",
            !team && "text-muted-foreground",
            isWinner && "text-emerald-600 dark:text-emerald-400"
          )}
        >
          {team?.name ?? "TBD"}
        </span>
      </div>
      {status !== "UPCOMING" && (
        <span
          className={cn(
            "text-sm font-bold tabular-nums",
            isWinner && "text-emerald-600 dark:text-emerald-400",
            isLoser && "text-muted-foreground"
          )}
        >
          {score}
        </span>
      )}
    </div>
  );
}
