import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
    "Real TSR for rated players; the rest predicted from team CSR offset. Weighted by scrim playtime.",
  csr_fallback:
    "Not enough rated playtime for TSR. Showing playtime-weighted per-hero CSR — not on the same scale as TSR.",
};

const CONFIDENCE_LABEL: Record<TeamTsrConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONTRIBUTION_LABEL: Record<TeamTsrMember["contributionType"], string> = {
  tsr: "TSR",
  predicted: "Predicted",
  csr: "CSR",
  none: "—",
};

function ratingToneClass(rating: number, source: TeamTsrSource): string {
  if (source === "csr_fallback") return "text-foreground";
  if (rating >= 4000) return "text-violet-500";
  if (rating >= 3500) return "text-indigo-400";
  if (rating >= 3000) return "text-emerald-500";
  if (rating >= 2500) return "text-sky-400";
  if (rating >= 2000) return "text-amber-400";
  return "text-muted-foreground";
}

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

export function TeamTsrCard({ result }: Props) {
  const ratingLabel = result.source === "csr_fallback" ? "Team CSR" : "Team TSR";
  const noData = result.value === null;
  const playtimeShare = Math.round(result.playtimeBackedShare * 100);

  return (
    <Card>
      <CardHeader className="border-border border-b">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {ratingLabel} · {result.ratedCount} of {result.rosterSize} rated ·{" "}
              {playtimeShare}% playtime backed
            </p>
            <h3 className="mt-1 text-base font-semibold tracking-tight">
              Roster skill rating
            </h3>
          </div>
          <div className="text-right">
            <div
              className={cn(
                "font-mono text-3xl font-semibold tabular-nums",
                noData
                  ? "text-muted-foreground"
                  : ratingToneClass(result.value!, result.source)
              )}
            >
              {noData ? "—" : result.value!.toLocaleString()}
            </div>
            <div className="text-muted-foreground mt-0.5 flex items-center justify-end gap-2 font-mono text-[10px] tracking-wider uppercase">
              <span>{SOURCE_LABEL[result.source]}</span>
              <span aria-hidden>·</span>
              <span>{CONFIDENCE_LABEL[result.confidence]}</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-muted-foreground/60 normal-case">
                    ⓘ
                  </span>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  {SOURCE_COPY[result.source]}
                  {result.offsetStdev !== null
                    ? ` Offset spread σ ${Math.round(result.offsetStdev)}.`
                    : ""}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {result.members.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add team members with linked BattleTags to compute a roster
            rating.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {result.members.map((m) => (
              <MemberRow key={m.userId} member={m} />
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MemberRow({ member }: { member: TeamTsrMember }) {
  const noPlaytime = member.playtimeSeconds <= 0;
  const noContribution = member.contribution === null;
  const weightPct = Math.round(member.playtimeWeight * 100);
  return (
    <li
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(0,7rem)_5rem_4rem] items-center gap-4 py-2 text-sm",
        noPlaytime && "opacity-60"
      )}
    >
      <div className="min-w-0">
        <div className="truncate font-medium">{displayName(member)}</div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
          {member.tsr !== null ? (
            <span>TSR {member.tsr.toLocaleString()}</span>
          ) : (
            <span>No TSR</span>
          )}
          {member.compositeCsr !== null ? (
            <span>· CSR {member.compositeCsr.toLocaleString()}</span>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="bg-muted h-1.5 flex-1 overflow-hidden rounded-full">
          <div
            className="bg-primary/70 h-full"
            style={{ width: `${weightPct}%` }}
          />
        </div>
        <span className="text-muted-foreground w-14 text-right font-mono text-[10px] tabular-nums">
          {noPlaytime ? "—" : `${weightPct}% · ${formatPlaytime(member.playtimeSeconds)}`}
        </span>
      </div>
      <div
        className={cn(
          "text-right font-mono text-base tabular-nums",
          noContribution && "text-muted-foreground"
        )}
      >
        {noContribution ? "—" : member.contribution!.toLocaleString()}
      </div>
      <div className="text-muted-foreground text-right font-mono text-[10px] tracking-wider uppercase">
        {CONTRIBUTION_LABEL[member.contributionType]}
      </div>
    </li>
  );
}
