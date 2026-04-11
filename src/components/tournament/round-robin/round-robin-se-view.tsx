"use client";

import { BracketView } from "@/components/tournament/bracket/bracket-view";
import type { BracketMatchData } from "@/components/tournament/bracket/bracket-match-card";
import { RRMatchGrid } from "@/components/tournament/round-robin/rr-match-grid";
import { StandingsTable } from "@/components/tournament/round-robin/standings-table";
import { Button } from "@/components/ui/button";
import type { TournamentMatchStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type Standing = {
  teamId: number;
  teamName: string;
  matchesWon: number;
  matchesLost: number;
  mapsWon: number;
  mapsLost: number;
  mapDifferential: number;
};

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

type RoundData = {
  roundNumber: number;
  roundName: string;
  matches: BracketMatchData[];
};

export function RoundRobinSEView({
  tournamentId,
  standings,
  advancingCount,
  rrRounds,
  playoffRounds,
  allRRComplete,
  playoffsSeeded,
  canManage,
}: {
  tournamentId: number;
  standings: Standing[];
  advancingCount: number;
  rrRounds: RRRound[];
  playoffRounds: RoundData[];
  allRRComplete: boolean;
  playoffsSeeded: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [isTransitioning, setIsTransitioning] = useState(false);

  async function handleTransition() {
    setIsTransitioning(true);
    try {
      const res = await fetch(
        `/api/tournament/${tournamentId}/transition-to-playoffs`,
        { method: "POST" }
      );
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        toast.error(body.error ?? "Failed to generate playoff bracket");
        return;
      }
      toast.success("Playoff bracket generated");
      router.refresh();
    } catch {
      toast.error("Failed to generate playoff bracket");
    } finally {
      setIsTransitioning(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h3 className="mb-4 text-lg font-semibold">Standings</h3>
        <StandingsTable
          standings={standings}
          advancingCount={advancingCount}
          tournamentId={tournamentId}
        />
      </div>

      <div>
        <h3 className="mb-4 text-lg font-semibold">Round Robin Matches</h3>
        <RRMatchGrid rounds={rrRounds} />
      </div>

      {canManage && allRRComplete && !playoffsSeeded && (
        <div className="flex justify-center">
          <Button onClick={handleTransition} disabled={isTransitioning}>
            {isTransitioning ? "Generating..." : "Generate Playoff Bracket"}
          </Button>
        </div>
      )}

      <div>
        <h3 className="mb-4 text-lg font-semibold">Playoffs</h3>
        {playoffsSeeded ? (
          <BracketView rounds={playoffRounds} />
        ) : (
          <p className="text-muted-foreground text-sm">
            Playoff bracket will appear here once round robin matches are
            complete and the bracket is generated.
          </p>
        )}
      </div>
    </div>
  );
}
