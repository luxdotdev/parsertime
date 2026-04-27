import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { AvailabilityOverlapBar } from "./availability-overlap-bar";
import type { MatchmakerCandidate } from "@/lib/matchmaker/candidates";
import type { Route } from "next";
import { cn } from "@/lib/utils";

type Props = {
  searcherTeamId: number;
  candidate: MatchmakerCandidate;
};

function bracketLabel(c: MatchmakerCandidate): string {
  return c.bracketBand ? `${c.bracketBand} ${c.bracketTier}` : c.bracketTier;
}

function formatDelta(d: number): string {
  if (d > 0) return `+${d}`;
  if (d < 0) return `−${Math.abs(d)}`;
  return "±0";
}

function deltaTone(d: number): string {
  const abs = Math.abs(d);
  if (abs <= 100) return "text-emerald-500";
  if (abs <= 300) return "text-primary";
  return "text-muted-foreground";
}

export function CandidateRow({ searcherTeamId, candidate }: Props) {
  const href = `/matchmaker/${searcherTeamId}/vs/${candidate.teamId}` as Route;
  const sentAt = candidate.cooledUntil
    ? new Date(candidate.cooledUntil.getTime() - 24 * 3_600_000)
    : null;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center justify-between gap-6 px-5 py-4 transition-colors",
        "hover:bg-muted/40",
        candidate.cooldownActive && "opacity-70"
      )}
    >
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium tracking-tight">
            {candidate.teamName}
          </span>
          <Badge variant="outline" className="font-mono">
            {bracketLabel(candidate)}
          </Badge>
          <Badge variant="outline" className="font-mono">
            {candidate.region}
          </Badge>
          {candidate.cooldownActive && sentAt && (
            <Badge variant="secondary" className="font-mono">
              Sent {formatDistanceToNow(sentAt, { addSuffix: true })}
            </Badge>
          )}
        </div>
        <AvailabilityOverlapBar hours={candidate.overlapHours} />
      </div>
      <div className="text-right">
        <div className="font-mono text-xl font-semibold tabular-nums">
          {candidate.rating.toLocaleString()}
        </div>
        <div
          className={cn(
            "mt-0.5 font-mono text-xs font-medium tabular-nums",
            deltaTone(candidate.delta)
          )}
        >
          {formatDelta(candidate.delta)}
        </div>
      </div>
    </Link>
  );
}
