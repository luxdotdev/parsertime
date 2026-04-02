"use client";

import { Badge } from "@/components/ui/badge";
import type { MapTransform } from "@/lib/map-calibration/types";

type TransformDisplayProps = {
  transform: MapTransform;
  residualError: number;
  saved: boolean;
};

export function TransformDisplay({
  transform,
  residualError,
  saved,
}: TransformDisplayProps) {
  const rotDeg = ((transform.rotation * 180) / Math.PI).toFixed(2);

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
        <span className="text-muted-foreground">Origin X:</span>
        <span>{transform.origin.x.toFixed(4)}</span>
        <span className="text-muted-foreground">Origin Y:</span>
        <span>{transform.origin.y.toFixed(4)}</span>
        <span className="text-muted-foreground">Scale:</span>
        <span>{transform.scale.toFixed(6)}</span>
        <span className="text-muted-foreground">Rotation:</span>
        <span>
          {rotDeg}&deg; ({transform.rotation.toFixed(6)} rad)
        </span>
        <span className="text-muted-foreground">Residual Error:</span>
        <span
          className={residualError > 10 ? "text-destructive" : "text-green-500"}
        >
          {residualError.toFixed(2)} px
        </span>
      </div>
    </div>
  );
}
