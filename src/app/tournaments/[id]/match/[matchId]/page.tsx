import { DashboardLayout } from "@/components/dashboard-layout";
import { MatchMapsPanel } from "@/components/tournament/match/match-maps-panel";
import { TeamPanel } from "@/components/tournament/match/team-panel";
import { TournamentAddMapCard } from "@/components/tournament/match/tournament-add-map-card";
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

export default async function TournamentMatchPage(props: {
  params: Promise<{ id: string; matchId: string }>;
}) {
  const tournamentEnabled = await tournament();
  if (!tournamentEnabled) notFound();

  const params = await props.params;
  const tournamentId = Number(params.id);
  const matchId = Number(params.matchId);
  if (Number.isNaN(tournamentId) || Number.isNaN(matchId)) notFound();

  const match = await AppRuntime.runPromise(
    TournamentService.pipe(
      Effect.flatMap((svc) => svc.getTournamentMatch(matchId))
    )
  );
  if (!match || match.tournamentId !== tournamentId) notFound();

  const isCompleted = match.status === "COMPLETED";
  const team1IsWinner = isCompleted && match.winnerId === match.team1Id;
  const team2IsWinner = isCompleted && match.winnerId === match.team2Id;

  const team1Name = match.team1?.name ?? "TBD";
  const team2Name = match.team2?.name ?? "TBD";
  const team1Image = match.team1?.team?.image ?? null;
  const team2Image = match.team2?.team?.image ?? null;

  const session = await auth();
  let canUpload = false;
  if (session?.user?.email) {
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, role: true },
    });
    canUpload =
      user?.id === match.tournament.creatorId ||
      user?.role === "ADMIN" ||
      user?.role === "MANAGER";
  }

  const bestOf = match.round.bestOf ?? match.tournament.bestOf;

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 p-4 pt-6 md:p-8">
        <div className="flex items-center gap-4">
          <Link
            href={`/tournaments/${tournamentId}` as Route}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold">
                {match.tournament.name} &mdash; {match.round.roundName}
              </h2>
              <Badge
                variant={
                  match.status === "COMPLETED"
                    ? "secondary"
                    : match.status === "ONGOING"
                      ? "default"
                      : "outline"
                }
              >
                {match.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm">
              Best of {match.tournament.bestOf}
            </p>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1fr_2fr_1fr]">
          <div className="flex items-center justify-center rounded-lg border p-4">
            <TeamPanel
              name={team1Name}
              image={team1Image}
              score={match.team1Score}
              isWinner={team1IsWinner}
              isLoser={team2IsWinner}
            />
          </div>

          <div className="space-y-4">
            <MatchMapsPanel
              tournamentId={tournamentId}
              matchId={matchId}
              maps={match.maps}
              team1Name={team1Name}
              team2Name={team2Name}
              scrimId={match.scrimId}
            />
            {canUpload && !isCompleted && (
              <TournamentAddMapCard
                matchId={matchId}
                bestOf={bestOf}
                currentMapCount={match.maps.length}
                team1Name={team1Name}
                team2Name={team2Name}
              />
            )}
          </div>

          <div className="flex items-center justify-center rounded-lg border p-4">
            <TeamPanel
              name={team2Name}
              image={team2Image}
              score={match.team2Score}
              isWinner={team2IsWinner}
              isLoser={team1IsWinner}
            />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
