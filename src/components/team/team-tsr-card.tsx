import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type {
  TeamTsrConfidence,
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
  tsr: "Mean of every starter's tournament rating.",
  predicted:
    "Real TSR for rated starters; the rest predicted from team CSR offset.",
  csr_fallback:
    "Not enough rated starters for TSR. Showing per-hero CSR average — not on the same scale as TSR.",
};

const CONFIDENCE_LABEL: Record<TeamTsrConfidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
};

const CONTRIBUTION_LABEL: Record<
  TeamTsrResult["starters"][number]["contributionType"],
  string
> = {
  tsr: "TSR",
  predicted: "Predicted",
  csr: "CSR",
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

type Props = {
  result: TeamTsrResult;
};

export function TeamTsrCard({ result }: Props) {
  const ratingLabel = result.source === "csr_fallback" ? "Team CSR" : "Team TSR";
  const noData = result.value === null;

  return (
    <Card>
      <CardHeader className="border-border border-b">
        <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
          <div>
            <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
              {ratingLabel} ·{" "}
              {result.realTsrCount} of {result.starterCount} rated
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
        {result.starters.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            Add team members with linked BattleTags to compute a roster
            rating.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {result.starters.map((s) => {
              const noContribution =
                s.contributionType === "csr" && s.compositeCsr === null;
              return (
                <li
                  key={s.userId}
                  className="grid grid-cols-[minmax(0,1fr)_5rem_4rem] items-center gap-4 py-2 text-sm"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium">
                      {s.battletag ?? s.name}
                    </div>
                    <div className="text-muted-foreground mt-0.5 flex items-center gap-2 font-mono text-[10px] tracking-wider uppercase">
                      {s.tsr !== null ? (
                        <span>TSR {s.tsr.toLocaleString()}</span>
                      ) : (
                        <span>No TSR</span>
                      )}
                      {s.compositeCsr !== null ? (
                        <span>· CSR {s.compositeCsr.toLocaleString()}</span>
                      ) : null}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "text-right font-mono text-base tabular-nums",
                      noContribution && "text-muted-foreground"
                    )}
                  >
                    {noContribution
                      ? "—"
                      : s.contribution.toLocaleString()}
                  </div>
                  <div className="text-muted-foreground text-right font-mono text-[10px] tracking-wider uppercase">
                    {CONTRIBUTION_LABEL[s.contributionType]}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {result.rosterSize > result.starterCount ? (
          <p className="text-muted-foreground/70 mt-3 text-[11px]">
            Roster has {result.rosterSize} members; rating uses the top{" "}
            {result.starterCount} by available rating signal.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
