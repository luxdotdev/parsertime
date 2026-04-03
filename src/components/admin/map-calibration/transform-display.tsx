"use client";

import { Badge } from "@/components/ui/badge";
import type { MapTransform } from "@/lib/map-calibration/types";

type TransformDisplayProps = {
  transform: MapTransform;
  residualError: number;
  imageWidth: number;
  saved: boolean;
};

export function TransformDisplay({
  transform,
  residualError,
  imageWidth,
  saved,
}: TransformDisplayProps) {
  const errorPct = ((residualError / imageWidth) * 100).toFixed(2);
  const det = transform.a * transform.d - transform.b * transform.c;
  const scaleX = Math.sqrt(transform.a ** 2 + transform.c ** 2);
  const scaleY = Math.sqrt(transform.b ** 2 + transform.d ** 2);

  return (
    <div className="space-y-2 rounded-lg border p-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium">Computed Transform</h4>
        {saved ? (
          <Badge variant="default">Saved</Badge>
        ) : (
          <Badge variant="secondary">Unsaved</Badge>
        )}
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-xs">
        <span className="text-muted-foreground">Scale X:</span>
        <span>{scaleX.toFixed(4)} px/unit</span>
        <span className="text-muted-foreground">Scale Y:</span>
        <span>{scaleY.toFixed(4)} px/unit</span>
        <span className="text-muted-foreground">Determinant:</span>
        <span>{det.toFixed(4)}</span>
        <span className="text-muted-foreground">Avg Error:</span>
        <span
          className={
            parseFloat(errorPct) > 5
              ? "text-destructive"
              : parseFloat(errorPct) > 2
                ? "text-yellow-500"
                : "text-green-500"
          }
        >
          {errorPct}% ({Math.round(residualError)}px)
        </span>
      </div>
      {parseFloat(errorPct) <= 5 ? (
        <p className="text-muted-foreground text-xs">
          Within expected tolerance for high-res images.
        </p>
      ) : null}
    </div>
  );
}
