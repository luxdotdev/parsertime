"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";

type TestPoint = {
  worldX: number;
  worldY: number;
  label?: string;
};

type PreviewModeProps = {
  onAddPoint: (point: TestPoint) => void;
  onClearPoints: () => void;
  pointCount: number;
  disabled: boolean;
};

export function PreviewMode({
  onAddPoint,
  onClearPoints,
  pointCount,
  disabled,
}: PreviewModeProps) {
  const [worldX, setWorldX] = useState("");
  const [worldY, setWorldY] = useState("");
  const [label, setLabel] = useState("");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const x = parseFloat(worldX);
    const y = parseFloat(worldY);
    if (isNaN(x) || isNaN(y)) return;

    onAddPoint({ worldX: x, worldY: y, label: label.trim() || undefined });
    setWorldX("");
    setWorldY("");
    setLabel("");
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <h4 className="text-sm font-medium">Preview Test Points</h4>
      <p className="text-muted-foreground text-xs">
        Enter world coordinates to verify they project to the expected map
        position.
      </p>
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs" htmlFor="previewX">
              World X
            </Label>
            <Input
              id="previewX"
              name="previewWorldX"
              type="number"
              step="any"
              autoComplete="off"
              value={worldX}
              onChange={(e) => setWorldX(e.target.value)}
              disabled={disabled}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor="previewY">
              World Y
            </Label>
            <Input
              id="previewY"
              name="previewWorldY"
              type="number"
              step="any"
              autoComplete="off"
              value={worldY}
              onChange={(e) => setWorldY(e.target.value)}
              disabled={disabled}
              className="h-8 text-xs"
            />
          </div>
          <div>
            <Label className="text-xs" htmlFor="previewLabel">
              Label
            </Label>
            <Input
              id="previewLabel"
              name="previewLabel"
              autoComplete="off"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              disabled={disabled}
              className="h-8 text-xs"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            size="sm"
            variant="secondary"
            disabled={disabled || !worldX || !worldY}
          >
            Add Test Point
          </Button>
          {pointCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearPoints}
            >
              Clear ({pointCount})
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
