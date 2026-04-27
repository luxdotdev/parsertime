import { TierLadder } from "@/components/charts/tsr/tier-ladder";
import { getTierBucket } from "@/lib/tsr/tier-bucket";

type Props = {
  fromRating: number;
  toRating: number;
};

export function SkillDeviation({ fromRating, toRating }: Props) {
  const delta = fromRating - toRating;
  const absDelta = Math.abs(delta);
  const fromBucket = getTierBucket(fromRating);
  const toBucket = getTierBucket(toRating);

  return (
    <section className="border-border bg-card rounded-xl border p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2">
        <div>
          <p className="text-muted-foreground font-mono text-[11px] tracking-[0.16em] uppercase">
            Skill deviation
          </p>
          <h2 className="mt-1 text-base font-semibold tracking-tight">
            {fromBucket.label} vs {toBucket.label}
          </h2>
        </div>
        <div className="text-right">
          <div className="font-mono text-2xl font-semibold tabular-nums">
            {absDelta.toLocaleString()}
          </div>
          <div className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            ΔTSR
          </div>
        </div>
      </div>
      <div className="mt-6 space-y-4">
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            Your team
          </p>
          <div className="mt-2">
            <TierLadder
              rating={fromRating}
              maxTierReached={fromBucket.tier}
              compact
            />
          </div>
        </div>
        <div>
          <p className="text-muted-foreground font-mono text-[10px] tracking-[0.16em] uppercase">
            Their team
          </p>
          <div className="mt-2">
            <TierLadder
              rating={toRating}
              maxTierReached={toBucket.tier}
              compact
            />
          </div>
        </div>
      </div>
    </section>
  );
}
