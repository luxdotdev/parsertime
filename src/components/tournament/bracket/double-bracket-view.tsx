"use client";

import { BracketView } from "@/components/tournament/bracket/bracket-view";
import { GrandFinalView } from "@/components/tournament/bracket/grand-final-view";
import type { BracketMatchData } from "@/components/tournament/bracket/bracket-match-card";

type RoundData = {
  roundNumber: number;
  roundName: string;
  bracket: string;
  matches: BracketMatchData[];
};

export function DoubleBracketView({ rounds }: { rounds: RoundData[] }) {
  const winnersRounds = rounds
    .filter((r) => r.bracket === "WINNERS")
    .sort((a, b) => a.roundNumber - b.roundNumber);

  const losersRounds = rounds
    .filter((r) => r.bracket === "LOSERS")
    .sort((a, b) => a.roundNumber - b.roundNumber);

  const grandFinalMatches = rounds
    .filter((r) => r.bracket === "GRAND_FINAL")
    .flatMap((r) => r.matches)
    .sort((a, b) => a.bracketPosition - b.bracketPosition);

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-emerald-500" />
          <span className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Winners Bracket
          </span>
        </div>
        <div className="rounded-lg border border-emerald-500/20 p-4">
          <BracketView rounds={winnersRounds} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-rose-500" />
          <span className="text-sm font-semibold uppercase tracking-wide text-rose-600 dark:text-rose-400">
            Losers Bracket
          </span>
        </div>
        <div className="rounded-lg border border-rose-500/20 p-4">
          <BracketView rounds={losersRounds} />
        </div>
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2">
          <div className="h-3 w-1 rounded-full bg-purple-500" />
          <span className="text-sm font-semibold uppercase tracking-wide text-purple-600 dark:text-purple-400">
            Grand Final
          </span>
        </div>
        <div className="rounded-lg border border-purple-500/20 p-4">
          <GrandFinalView matches={grandFinalMatches} />
        </div>
      </div>
    </div>
  );
}
