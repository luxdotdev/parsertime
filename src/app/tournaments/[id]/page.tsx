import { DashboardLayout } from "@/components/dashboard-layout";
import { BracketView } from "@/components/tournament/bracket/bracket-view";
import { DoubleBracketView } from "@/components/tournament/bracket/double-bracket-view";
import type { BracketMatchData } from "@/components/tournament/bracket/bracket-match-card";
import { TournamentActions } from "@/components/tournament/tournament-actions";
import { Badge } from "@/components/ui/badge";
import { getTournamentBracket } from "@/data/tournament-dto";
import { tournament } from "@/lib/flags";
import { ArrowLeft } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function TournamentDetailPage(props: {
  params: Promise<{ id: string }>;
}) {
  const tournamentEnabled = await tournament();
  if (!tournamentEnabled) notFound();

  const params = await props.params;
  const id = Number(params.id);
  if (Number.isNaN(id)) notFound();

  const data = await getTournamentBracket(id);
  if (!data) notFound();

  // Group matches by round
  const roundMap = new Map<
    string,
    { roundName: string; bracket: string; roundNumber: number; matches: BracketMatchData[] }
  >();

  for (const round of data.rounds) {
    const key = `${round.bracket}-${round.roundNumber}`;
    roundMap.set(key, {
      roundName: round.roundName,
      bracket: round.bracket,
      roundNumber: round.roundNumber,
      matches: [],
    });
  }

  for (const match of data.matches) {
    const key = `${match.round.bracket}-${match.round.roundNumber}`;
    const roundEntry = roundMap.get(key);
    if (!roundEntry) continue;

    roundEntry.matches.push({
      id: match.id,
      tournamentId: data.id,
      bracketPosition: match.bracketPosition,
      status: match.status,
      team1: match.team1
        ? { id: match.team1.id, name: match.team1.name, seed: match.team1.seed }
        : null,
      team2: match.team2
        ? { id: match.team2.id, name: match.team2.name, seed: match.team2.seed }
        : null,
      team1Score: match.team1Score,
      team2Score: match.team2Score,
      winnerId: match.winner?.id ?? null,
    });
  }

  const rounds = Array.from(roundMap.values()).map((entry) => ({
    ...entry,
    matches: entry.matches.sort((a, b) => a.bracketPosition - b.bracketPosition),
  }));

  const statusVariants: Record<
    string,
    "default" | "secondary" | "destructive" | "outline"
  > = {
    DRAFT: "outline",
    ACTIVE: "default",
    COMPLETED: "secondary",
    CANCELLED: "destructive",
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-[calc(100vh-4rem)] flex-col space-y-4 p-4 pt-6 md:p-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href={"/tournaments" as Route}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-3xl font-bold tracking-tight">
                  {data.name}
                </h2>
                <Badge variant={statusVariants[data.status]}>
                  {data.status}
                </Badge>
              </div>
              <p className="text-muted-foreground text-sm">
                {data.format.replace(/_/g, " ")} &middot; Bo{data.bestOf}{" "}
                &middot; {data.teams.length} teams
              </p>
            </div>
          </div>
          <TournamentActions
            tournamentId={data.id}
            currentStatus={data.status}
          />
        </div>

        <div className="flex-1 rounded-lg border p-6">
          {data.format === "DOUBLE_ELIMINATION" ? (
            <DoubleBracketView rounds={rounds} />
          ) : (
            <BracketView rounds={rounds} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
