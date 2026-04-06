import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { TournamentMatchStatus } from "@prisma/client";
import type { Route } from "next";
import Link from "next/link";

type RRMatch = {
  id: number;
  tournamentId: number;
  status: TournamentMatchStatus;
  team1Name: string;
  team2Name: string;
  team1Score: number;
  team2Score: number;
  winnerId: number | null;
  team1Id: number | null;
  team2Id: number | null;
};

type RRRound = {
  roundName: string;
  matches: RRMatch[];
};

export function RRMatchGrid({ rounds }: { rounds: RRRound[] }) {
  return (
    <div className="space-y-6">
      {rounds.map((round) => (
        <div key={round.roundName}>
          <h4 className="text-muted-foreground mb-3 text-xs font-medium tracking-wide uppercase">
            {round.roundName}
          </h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {round.matches.map((match) => (
              <RRMatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function RRMatchCard({ match }: { match: RRMatch }) {
  const isCompleted = match.status === "COMPLETED";
  const isOngoing = match.status === "ONGOING";
  const team1IsWinner = isCompleted && match.winnerId === match.team1Id;
  const team2IsWinner = isCompleted && match.winnerId === match.team2Id;

  return (
    <Link
      href={`/tournaments/${match.tournamentId}/match/${match.id}` as Route}
    >
      <Card
        className={cn(
          "flex cursor-pointer flex-col gap-0 overflow-hidden py-0 transition-all hover:shadow-md",
          isOngoing && "border-primary",
          isCompleted && "border-border"
        )}
      >
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2",
            team1IsWinner && "bg-emerald-500/10"
          )}
        >
          <span
            className={cn(
              "truncate text-sm font-medium",
              team1IsWinner && "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {match.team1Name}
          </span>
          {match.status !== "UPCOMING" && (
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                team1IsWinner && "text-emerald-600 dark:text-emerald-400",
                team2IsWinner && "text-muted-foreground"
              )}
            >
              {match.team1Score}
            </span>
          )}
        </div>
        <div className="border-t" />
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2",
            team2IsWinner && "bg-emerald-500/10"
          )}
        >
          <span
            className={cn(
              "truncate text-sm font-medium",
              team2IsWinner && "text-emerald-600 dark:text-emerald-400"
            )}
          >
            {match.team2Name}
          </span>
          {match.status !== "UPCOMING" && (
            <span
              className={cn(
                "text-sm font-bold tabular-nums",
                team2IsWinner && "text-emerald-600 dark:text-emerald-400",
                team1IsWinner && "text-muted-foreground"
              )}
            >
              {match.team2Score}
            </span>
          )}
        </div>
      </Card>
    </Link>
  );
}
