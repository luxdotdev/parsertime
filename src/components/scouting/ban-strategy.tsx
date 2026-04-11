"use client";

import { ConfidenceDot } from "@/components/scouting/confidence-indicator";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type {
  BanDisruptionEntry,
  HeroBanIntelligence,
  HeroExposure,
  ProtectedHero,
} from "@/data/intelligence/types";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Info,
  Shield,
  Target,
} from "lucide-react";
import { useState } from "react";

type BanStrategyProps = {
  banIntelligence: HeroBanIntelligence;
  hasUserTeamLink: boolean;
};

const MAX_DISRUPTION_TARGETS = 6;

export function BanStrategy({
  banIntelligence,
  hasUserTeamLink,
}: BanStrategyProps) {
  return (
    <div className="space-y-4">
      <DisruptionTargets rankings={banIntelligence.banDisruptionRanking} />

      {hasUserTeamLink ? (
        <TheirBanTargets exposures={banIntelligence.heroExposure} />
      ) : (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
            <Info
              className="text-muted-foreground h-8 w-8"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">
                Select your team to see their ban targets
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                Use the &ldquo;Scouting for&rdquo; picker above to select your
                team and see which of your heroes the opponent targets.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <ProtectedHeroesSection heroes={banIntelligence.protectedHeroes} />
    </div>
  );
}

function DisruptionTargets({ rankings }: { rankings: BanDisruptionEntry[] }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll
    ? rankings
    : rankings.slice(0, MAX_DISRUPTION_TARGETS);

  if (rankings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-4 w-4" aria-hidden="true" />
            Disruption Targets
          </CardTitle>
          <CardDescription>
            Heroes to ban against them, ranked by expected disruption
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-4 text-center text-sm">
            Not enough ban data to calculate disruption scores.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-4 w-4" aria-hidden="true" />
          Disruption Targets
        </CardTitle>
        <CardDescription>
          Heroes to ban against them — higher disruption score means a bigger
          impact on their win rate when banned
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {visible.map((entry, i) => (
            <div
              key={entry.hero}
              className="flex items-center gap-3 rounded-md border px-3 py-2"
            >
              <span className="text-muted-foreground flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium tabular-nums">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{entry.hero}</span>
                  <ConfidenceDot confidence={entry.confidence} />
                </div>
                <div className="text-muted-foreground flex gap-3 text-xs tabular-nums">
                  <span>
                    {entry.winRateDelta > 0 ? "−" : "+"}
                    {Math.abs(Math.round(entry.winRateDelta))}pp when banned
                  </span>
                  <span>
                    {entry.mapsAvailable} available / {entry.mapsBanned} banned
                  </span>
                </div>
              </div>
              <Badge variant="secondary" className="shrink-0 tabular-nums">
                {entry.disruptionScore.toFixed(1)}
              </Badge>
            </div>
          ))}
        </div>
        {rankings.length > MAX_DISRUPTION_TARGETS && (
          <button
            type="button"
            className="text-muted-foreground mt-3 w-full text-center text-xs hover:underline"
            onClick={() => setShowAll(!showAll)}
          >
            {showAll
              ? "Show fewer"
              : `Show ${rankings.length - MAX_DISRUPTION_TARGETS} more`}
          </button>
        )}
      </CardContent>
    </Card>
  );
}

function TheirBanTargets({ exposures }: { exposures: HeroExposure[] }) {
  if (exposures.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-4 w-4" aria-hidden="true" />
            Their Ban Targets
          </CardTitle>
          <CardDescription>
            How their ban patterns overlap with your most-played heroes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground py-4 text-center text-sm">
            No overlap found between their bans and your hero pool.
          </p>
        </CardContent>
      </Card>
    );
  }

  const critical = exposures.filter((e) => e.exposureRisk === "high");
  const watch = exposures.filter((e) => e.exposureRisk === "medium");
  const safe = exposures.filter((e) => e.exposureRisk === "low");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="h-4 w-4" aria-hidden="true" />
          Their Ban Targets
        </CardTitle>
        <CardDescription>
          Cross-references their ban patterns with your most-played heroes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {critical.length > 0 && (
          <ExposureSection level="critical" exposures={critical} />
        )}
        {watch.length > 0 && (
          <ExposureSection level="watch" exposures={watch} />
        )}
        {safe.length > 0 && <ExposureSection level="safe" exposures={safe} />}
      </CardContent>
    </Card>
  );
}

function ExposureSection({
  level,
  exposures,
}: {
  level: "critical" | "watch" | "safe";
  exposures: HeroExposure[];
}) {
  const config = {
    critical: {
      icon: AlertTriangle,
      label: "Critical",
      className:
        "text-red-600 dark:text-red-400 bg-red-500/10 border-red-500/20",
      iconClassName: "text-red-600 dark:text-red-400",
    },
    watch: {
      icon: Eye,
      label: "Watch",
      className:
        "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20",
      iconClassName: "text-amber-600 dark:text-amber-400",
    },
    safe: {
      icon: CheckCircle2,
      label: "Safe",
      className:
        "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
      iconClassName: "text-emerald-600 dark:text-emerald-400",
    },
  } as const;

  const { icon: Icon, label, className, iconClassName } = config[level];

  return (
    <div>
      <div className="mb-2 flex items-center gap-1.5">
        <Icon className={cn("h-3.5 w-3.5", iconClassName)} aria-hidden="true" />
        <span className={cn("text-xs font-semibold", iconClassName)}>
          {label}
        </span>
      </div>
      <div className="space-y-1.5">
        {exposures.map((e) => (
          <div
            key={e.hero}
            className={cn("rounded-md border px-3 py-2 text-sm", className)}
          >
            <span className="font-medium">{e.hero}</span>
            <span className="text-muted-foreground">
              {" "}
              — they ban it {Math.round(e.opponentBanRate)}% of maps; your team
              plays it {Math.round(e.userPlayRate)}% of the time
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProtectedHeroesSection({ heroes }: { heroes: ProtectedHero[] }) {
  if (heroes.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-4 w-4" aria-hidden="true" />
          Protected Heroes
        </CardTitle>
        <CardDescription>
          Heroes this team rarely bans — expect them to appear in compositions
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {heroes.map((h) => (
            <Badge key={h.hero} variant="outline">
              {h.hero}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
