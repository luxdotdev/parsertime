"use client";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ConfidenceIndicator } from "@/components/scouting/confidence-indicator";
import type { Insight } from "@/lib/insights";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  ChevronDown,
  Map,
  Shield,
  Swords,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import { useState } from "react";

type InsightCardProps = {
  insight: Insight;
  index?: number;
};

const CATEGORY_ICON = {
  map_advantage: Map,
  map_vulnerability: Map,
  ban_exploitation: Target,
  ban_defense: Shield,
  player_highlight: User,
  player_vulnerability: User,
  trend_alert: TrendingUp,
} as const;

const CATEGORY_LABEL = {
  map_advantage: "Map Advantage",
  map_vulnerability: "Map Vulnerability",
  ban_exploitation: "Ban Opportunity",
  ban_defense: "Ban Defense",
  player_highlight: "Player Highlight",
  player_vulnerability: "Player Vulnerability",
  trend_alert: "Trend Alert",
} as const;

export function InsightCard({ insight, index = 0 }: InsightCardProps) {
  const [open, setOpen] = useState(false);
  const Icon = CATEGORY_ICON[insight.category];
  const isLowConfidence =
    insight.confidence.level === "low" ||
    insight.confidence.level === "insufficient";

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-opacity",
        isLowConfidence ? "border-dashed opacity-80" : "border-border",
        "animate-in fade-in slide-in-from-bottom-2"
      )}
      style={{
        animationDelay: `${index * 150}ms`,
        animationFillMode: "backwards",
        animationDuration: "300ms",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Icon
            className="text-muted-foreground h-4 w-4 shrink-0"
            aria-hidden="true"
          />
          <span className="text-muted-foreground text-xs font-medium">
            {CATEGORY_LABEL[insight.category]}
          </span>
        </div>
        <ConfidenceIndicator confidence={insight.confidence} size="sm" />
      </div>

      <p
        className={cn(
          "mt-2 text-lg font-semibold tracking-tight tabular-nums",
          isLowConfidence && "opacity-70"
        )}
      >
        {insight.headline}
      </p>

      <p className="text-muted-foreground mt-1 text-sm">{insight.detail}</p>

      {insight.actionItems.length > 0 && (
        <div className="mt-3 space-y-1.5 border-t pt-3">
          {insight.actionItems.map((action) => (
            <div key={action} className="flex items-start gap-2 text-sm">
              <ArrowRight
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                aria-hidden="true"
              />
              <span>{action}</span>
            </div>
          ))}
        </div>
      )}

      {insight.dataPoints.length > 0 && (
        <Collapsible open={open} onOpenChange={setOpen}>
          <CollapsibleTrigger className="text-muted-foreground mt-3 flex items-center gap-1 text-xs hover:underline">
            <ChevronDown
              className={cn(
                "h-3 w-3 transition-transform",
                open && "rotate-180"
              )}
              aria-hidden="true"
            />
            {open ? "Hide supporting data" : "Show supporting data"}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {insight.dataPoints.map((dp) => (
                <div
                  key={dp.label}
                  className="bg-muted/50 rounded-md px-2.5 py-1.5"
                >
                  <p className="text-muted-foreground text-[10px] uppercase tracking-wide">
                    {dp.label}
                  </p>
                  <p className="text-sm font-medium tabular-nums">
                    {dp.value}
                    {dp.unit ? ` ${dp.unit}` : ""}
                  </p>
                </div>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}

      <div className="mt-2">
        <Badge variant="outline" className="text-[10px]">
          {insight.dataSource === "owcs"
            ? "Competitive data"
            : insight.dataSource === "scrim"
              ? "Scrim data"
              : "Competitive + Scrim"}
        </Badge>
      </div>
    </div>
  );
}
