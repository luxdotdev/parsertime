"use client";

import {
  BracketMatchCard,
  type BracketMatchData,
} from "@/components/tournament/bracket/bracket-match-card";

export function GrandFinalView({ matches }: { matches: BracketMatchData[] }) {
  if (matches.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-8 py-4">
      {matches.map((match) => (
        <div key={match.id} className="w-72">
          <BracketMatchCard match={match} />
        </div>
      ))}
    </div>
  );
}
