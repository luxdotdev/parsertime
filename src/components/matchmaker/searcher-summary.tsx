import { getTierBucket } from "@/lib/tsr/tier-bucket";
import { Badge } from "@/components/ui/badge";
import { TierLadder } from "@/components/charts/tsr/tier-ladder";
import type { SearcherSummary as Summary } from "@/lib/matchmaker/candidates";

type Props = { summary: Summary };

export function SearcherSummary({ summary }: Props) {
  const bucket = getTierBucket(summary.rating);
  return (
    <header className="border-border bg-card/40 rounded-xl border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-8 gap-y-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">
            Scrim matchmaker
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Searching as{" "}
            <span className="text-foreground font-medium">
              {summary.teamName}
            </span>
          </p>
        </div>
        <div className="text-right">
          <div className="font-mono text-3xl font-semibold tabular-nums">
            {summary.rating.toLocaleString()}
          </div>
          <div className="text-muted-foreground mt-1 flex items-center justify-end gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
            <Badge variant="outline" className="font-mono">
              {bucket.label}
            </Badge>
            <Badge variant="outline" className="font-mono">
              {summary.region}
            </Badge>
            <span>{summary.requestsRemaining} of 10 daily remaining</span>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <TierLadder
          rating={summary.rating}
          maxTierReached={bucket.tier}
          compact
        />
      </div>
    </header>
  );
}
