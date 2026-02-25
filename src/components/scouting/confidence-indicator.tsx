"use client";

import { Badge } from "@/components/ui/badge";
import type { ConfidenceMetadata } from "@/lib/confidence";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  CircleDot,
} from "lucide-react";

type ConfidenceIndicatorProps = {
  confidence: ConfidenceMetadata;
  showLabel?: boolean;
  size?: "sm" | "default";
};

const CONFIDENCE_ICON = {
  high: CheckCircle2,
  medium: CircleDot,
  low: AlertTriangle,
  insufficient: CircleDashed,
} as const;

export function ConfidenceIndicator({
  confidence,
  showLabel = true,
  size = "default",
}: ConfidenceIndicatorProps) {
  const Icon = CONFIDENCE_ICON[confidence.level];
  const iconSize = size === "sm" ? "h-3 w-3" : "h-3.5 w-3.5";

  return (
    <Badge
      variant={confidence.level === "high" ? "default" : "secondary"}
      className={cn(
        "gap-1",
        size === "sm" && "px-1.5 py-0 text-[10px]",
        confidence.level === "low" && "border border-dashed opacity-70",
        confidence.level === "insufficient" && "border border-dashed opacity-50"
      )}
      title={confidence.label}
    >
      <Icon className={cn(iconSize, "shrink-0")} aria-hidden="true" />
      {showLabel && (
        <span>
          {confidence.level === "high"
            ? "High"
            : confidence.level === "medium"
              ? "Medium"
              : confidence.level === "low"
                ? "Low"
                : "Insufficient"}
        </span>
      )}
    </Badge>
  );
}

type ConfidenceDotProps = {
  confidence: ConfidenceMetadata;
  className?: string;
};

export function ConfidenceDot({ confidence, className }: ConfidenceDotProps) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        confidence.level === "high" && "bg-emerald-500",
        confidence.level === "medium" && "bg-amber-500",
        confidence.level === "low" && "bg-amber-500/50",
        confidence.level === "insufficient" && "bg-muted-foreground/30",
        className
      )}
      title={confidence.label}
      aria-label={confidence.label}
    />
  );
}
