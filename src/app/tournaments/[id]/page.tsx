import { DashboardLayout } from "@/components/dashboard-layout";
import { BracketView } from "@/components/tournament/bracket/bracket-view";
import { DoubleBracketView } from "@/components/tournament/bracket/double-bracket-view";
import type { BracketMatchData } from "@/components/tournament/bracket/bracket-match-card";
import { RoundRobinSEView } from "@/components/tournament/round-robin/round-robin-se-view";
import { TournamentActions } from "@/components/tournament/tournament-actions";
import { Badge } from "@/components/ui/badge";
import { Effect } from "effect";
import { AppRuntime } from "@/data/runtime";
import { TournamentService } from "@/data/tournament";
import { auth } from "@/lib/auth";
import { tournament } from "@/lib/flags";
import prisma from "@/lib/prisma";
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

  const data = await AppRuntime.runPromise(
    TournamentService.pipe(
      Effect.flatMap((svc) => svc.getTournamentBracket(id))
    )
  );
  if (!data) notFound();

  let rrStandings: {
    teamId: number;
    teamName: string;
    matchesWon: number;
    matchesLost: number;
    mapsWon: number;
    mapsLost: number;
    mapDifferential: number;
  }[] = [];
  let canManage = false;

  if (data.format === "ROUND_ROBIN_SE") {
    rrStandings = await AppRuntime.runPromise(
      TournamentService.pipe(
        Effect.flatMap((svc) => svc.getRRStandings(id))
      )
    );

    const session = await auth();
    if (session?.user?.email) {
      const user = await prisma.user.findUnique({
        where: { email: session.user.email },
        select: { id: true, role: true },
      });
      canManage =
        user?.id === data.creatorId ||
        user?.role === "ADMIN" ||
        user?.role === "MANAGER";
    }
  }

  const roundMap = new Map<
    string,
    {
      roundName: string;
      bracket: string;
      roundNumber: number;
      matches: BracketMatchData[];
    }
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
    matches: entry.matches.sort(
      (a, b) => a.bracketPosition - b.bracketPosition
    ),
  }));

  const rrRounds = rounds
    .filter((r) => r.bracket === "ROUND_ROBIN")
    .map((r) => ({
      roundName: r.roundName,
      matches: r.matches.map((m) => ({
        id: m.id,
        tournamentId: data.id,
        status: m.status,
        team1Name: m.team1?.name ?? "TBD",
        team2Name: m.team2?.name ?? "TBD",
        team1Score: m.team1Score,
        team2Score: m.team2Score,
        winnerId: m.winnerId,
        team1Id: m.team1?.id ?? null,
        team2Id: m.team2?.id ?? null,
      })),
    }));

  const playoffRounds = rounds.filter((r) => r.bracket === "WINNERS");

  const allRRComplete =
    rrRounds.length > 0 &&
    rrRounds.every((r) => r.matches.every((m) => m.status === "COMPLETED"));

  const playoffsSeeded = playoffRounds.some((r) =>
    r.matches.some((m) => m.team1 !== null || m.team2 !== null)
  );

  const advancingCount = data.advancingTeams ?? data.teams.length;

  const serializedStandings = rrStandings.map((s) => ({
    teamId: s.teamId,
    teamName: s.teamName,
    matchesWon: s.matchesWon,
    matchesLost: s.matchesLost,
    mapsWon: s.mapsWon,
    mapsLost: s.mapsLost,
    mapDifferential: s.mapDifferential,
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
          {data.format === "ROUND_ROBIN_SE" ? (
            <RoundRobinSEView
              tournamentId={data.id}
              standings={serializedStandings}
              advancingCount={advancingCount}
              rrRounds={rrRounds}
              playoffRounds={playoffRounds}
              allRRComplete={allRRComplete}
              playoffsSeeded={playoffsSeeded}
              canManage={canManage}
            />
          ) : data.format === "DOUBLE_ELIMINATION" ? (
            <DoubleBracketView rounds={rounds} />
          ) : (
            <BracketView rounds={rounds} />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
