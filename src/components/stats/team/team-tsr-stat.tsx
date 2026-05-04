"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import type {
  TeamTsrConfidence,
  TeamTsrMember,
  TeamTsrResult,
  TeamTsrSource,
} from "@/lib/tsr/team";
import { cn } from "@/lib/utils";

const SOURCE_LABEL: Record<TeamTsrSource, string> = {
  tsr: "Real TSR",
  predicted: "Predicted",
  csr_fallback: "CSR fallback",
};

const SOURCE_COPY: Record<TeamTsrSource, string> = {
  tsr: "Playtime-weighted mean of every active starter's tournament rating.",
  predicted:
    "Real TSR for rated players; the rest predicted from team CSR offset, weighted by scrim playtime.",
  csr_fallback:
    "Not enough rated playtime for TSR. Showing playtime-weighted per-hero CSR.",
};

const CONFIDENCE_LABEL: Record<TeamTsrConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONTRIBUTION_LABEL: Record<TeamTsrMember["contributionType"], string> = {
  tsr: "TSR",
  predicted: "PRED",
  csr: "CSR",
  none: "—",
};

function displayName(member: TeamTsrMember): string {
  const handle = member.battletag ?? member.name;
  return handle.split("#")[0] || handle;
}

function formatPlaytime(seconds: number): string {
  if (seconds <= 0) return "—";
  const hours = seconds / 3600;
  if (hours >= 1) return `${hours.toFixed(1)}h`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m`;
}

type Props = {
  result: TeamTsrResult;
};

export function TeamTsrStat({ result }: Props) {
  const noData = result.value === null;
  const ratingLabel = result.source === "csr_fallback" ? "Rating" : "TSR";
  const playtimeShare = Math.round(result.playtimeBackedShare * 100);

  return (
    <HoverCard openDelay={150} closeDelay={75}>
      <HoverCardTrigger asChild>
        <button
          type="button"
          className="hover:bg-muted/40 -mx-2 flex flex-col rounded-sm px-2 py-0.5 text-left transition-colors"
        >
          <span className="text-muted-foreground text-[10px] tracking-[0.18em] uppercase">
            {ratingLabel}
          </span>
          <span
            className={cn(
              "text-lg font-medium tabular-nums",
              noData ? "text-muted-foreground" : "text-foreground"
            )}
          >
            {noData ? "—" : result.value!.toLocaleString()}
          </span>
        </button>
      </HoverCardTrigger>
      <HoverCardContent align="end" className="w-80">
        <div className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
                {SOURCE_LABEL[result.source]} ·{" "}
                {CONFIDENCE_LABEL[result.confidence]}
              </p>
              <p className="text-base font-semibold">Roster skill rating</p>
            </div>
            <span className="text-foreground font-mono text-2xl font-semibold tabular-nums">
              {noData ? "—" : result.value!.toLocaleString()}
            </span>
          </div>

          <p className="text-muted-foreground text-xs leading-relaxed">
            {SOURCE_COPY[result.source]}
          </p>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-[10px] tracking-[0.16em] uppercase">
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Rated</dt>
              <dd className="tabular-nums">
                {result.ratedCount}/{result.rosterSize}
              </dd>
            </div>
            <div className="flex justify-between gap-2">
              <dt className="text-muted-foreground">Backed</dt>
              <dd className="tabular-nums">{playtimeShare}%</dd>
            </div>
            {result.offsetStdev !== null ? (
              <div className="col-span-2 flex justify-between gap-2">
                <dt className="text-muted-foreground">Offset σ</dt>
                <dd className="tabular-nums">
                  {Math.round(result.offsetStdev)}
                </dd>
              </div>
            ) : null}
          </dl>

          {result.members.length === 0 ? (
            <p className="text-muted-foreground text-xs">
              Add team members with linked BattleTags to compute a roster
              rating.
            </p>
          ) : (
            <ul className="divide-border divide-y border-t border-[var(--border)]">
              {result.members.slice(0, 6).map((m) => (
                <li
                  key={m.userId}
                  className={cn(
                    "grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 py-1.5 text-xs",
                    m.playtimeSeconds <= 0 && "opacity-60"
                  )}
                >
                  <span className="truncate font-medium">{displayName(m)}</span>
                  <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                    {formatPlaytime(m.playtimeSeconds)}
                  </span>
                  <span className="font-mono tabular-nums">
                    {m.contribution === null ? (
                      <span className="text-muted-foreground">
                        {CONTRIBUTION_LABEL[m.contributionType]}
                      </span>
                    ) : (
                      <>
                        {m.contribution.toLocaleString()}
                        <span className="text-muted-foreground ml-1.5 text-[9px] tracking-[0.16em] uppercase">
                          {CONTRIBUTION_LABEL[m.contributionType]}
                        </span>
                      </>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
