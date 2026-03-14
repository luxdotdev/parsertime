"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { TargetProgress } from "@/data/targets-dto";

type Props = {
  progress: TargetProgress[];
};

export function TargetProgressCard({ progress }: Props) {
  const onTrack = progress.filter((p) => p.progressPercent >= 75).length;
  const mixed = progress.filter(
    (p) => p.progressPercent >= 25 && p.progressPercent < 75
  ).length;
  const behind = progress.filter((p) => p.progressPercent < 25).length;
  const total = progress.length;

  if (total === 0) return null;

  const overallPercent =
    progress.reduce((sum, p) => sum + p.progressPercent, 0) / total;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Target Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="relative h-16 w-16">
            <svg viewBox="0 0 36 36" className="h-16 w-16 -rotate-90">
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                className="text-muted"
                strokeWidth="3"
              />
              <circle
                cx="18"
                cy="18"
                r="15.5"
                fill="none"
                stroke="currentColor"
                className={
                  overallPercent >= 75
                    ? "text-green-500"
                    : overallPercent >= 25
                      ? "text-yellow-500"
                      : "text-red-500"
                }
                strokeWidth="3"
                strokeDasharray={`${overallPercent} ${100 - overallPercent}`}
                strokeLinecap="round"
              />
            </svg>
            <span
              className="absolute inset-0 flex items-center justify-center text-xs font-bold"
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {Math.round(overallPercent)}%
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="font-semibold text-green-500">{onTrack}</span> on
              track
            </p>
            <p>
              <span className="font-semibold text-yellow-500">{mixed}</span> in
              progress
            </p>
            <p>
              <span className="font-semibold text-red-500">{behind}</span>{" "}
              behind
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
