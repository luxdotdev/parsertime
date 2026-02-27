"use client";

import { ConfidenceIndicator } from "@/components/scouting/confidence-indicator";
import { InsightCard } from "@/components/scouting/insight-card";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { DataAvailabilityProfile } from "@/lib/data-availability";
import type { InsightReport } from "@/lib/insights";
import { cn } from "@/lib/utils";
import { ChevronDown, Info } from "lucide-react";
import { useState } from "react";

type ScoutingReportProps = {
  report: InsightReport;
  opponentAbbr: string;
  hasUserTeamLink: boolean;
  dataAvailability?: DataAvailabilityProfile;
};

export function ScoutingReport({
  report,
  opponentAbbr,
  hasUserTeamLink,
  dataAvailability,
}: ScoutingReportProps) {
  const [secondaryOpen, setSecondaryOpen] = useState(false);

  const isScrimOnly = dataAvailability?.opponentDataSource === "scrim";
  const hasInsights = report.primary.length > 0 || report.secondary.length > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-bold tracking-tight">
            Pre-Match Brief: vs. {opponentAbbr}
          </h2>
          <ConfidenceIndicator confidence={report.overallConfidence} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SourceLabel dataAvailability={dataAvailability} />
          {isScrimOnly && (
            <Badge
              variant="secondary"
              className="border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400"
            >
              Scrim data only — no competitive history available
            </Badge>
          )}
        </div>
      </div>

      {!hasUserTeamLink && (
        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardContent className="flex items-start gap-3 py-4">
            <Info
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
              aria-hidden="true"
            />
            <div>
              <p className="text-sm font-medium">
                Select your team for the full report
              </p>
              <p className="text-muted-foreground text-xs">
                Cross-referenced insights (map matchups, player vulnerabilities)
                require selecting your team with the &ldquo;Scouting for&rdquo;
                picker above. Opponent-only insights are shown below.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {hasInsights ? (
        <>
          {report.primary.length > 0 && (
            <section aria-label="Top insights">
              <h3 className="text-muted-foreground mb-3 text-sm font-semibold tracking-wider uppercase">
                Top Insights
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {report.primary.map((insight, i) => (
                  <InsightCard key={insight.id} insight={insight} index={i} />
                ))}
              </div>
            </section>
          )}

          {report.secondary.length > 0 && (
            <Collapsible open={secondaryOpen} onOpenChange={setSecondaryOpen}>
              <CollapsibleTrigger className="hover:bg-muted/50 flex w-full items-center gap-2 rounded-md border px-4 py-3 text-sm font-medium">
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform",
                    secondaryOpen && "rotate-180"
                  )}
                  aria-hidden="true"
                />
                Additional Findings ({report.secondary.length})
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {report.secondary.map((insight, i) => (
                    <InsightCard key={insight.id} insight={insight} index={i} />
                  ))}
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Info
              className="text-muted-foreground mx-auto mb-3 h-8 w-8"
              aria-hidden="true"
            />
            <p className="font-medium">Not enough data yet</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Check back after more matches are played. Insights require a
              minimum sample size to be reliable.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function SourceLabel({
  dataAvailability,
}: {
  dataAvailability?: DataAvailabilityProfile;
}) {
  if (!dataAvailability) return null;

  const { opponentOwcsMaps, opponentScrimMaps, opponentDataSource } =
    dataAvailability;

  const labelParts: string[] = [];
  if (opponentDataSource === "owcs" || opponentDataSource === "owcs+scrim") {
    labelParts.push(
      `${opponentOwcsMaps} competitive ${opponentOwcsMaps === 1 ? "map" : "maps"}`
    );
  }
  if (opponentDataSource === "scrim" || opponentDataSource === "owcs+scrim") {
    labelParts.push(
      `${opponentScrimMaps} scrim ${opponentScrimMaps === 1 ? "map" : "maps"}`
    );
  }

  if (labelParts.length === 0) return null;

  return (
    <span className="text-muted-foreground text-sm tabular-nums">
      Based on {labelParts.join(" and ")}
    </span>
  );
}
