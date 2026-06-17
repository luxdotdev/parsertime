"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { useTranslations } from "next-intl";
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
  const t = useTranslations("mapCalibrationPage.preview");
  const { team1, team2 } = useColorblindMode();
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
      <h4 className="text-sm font-medium">{t("title")}</h4>
      <p className="text-muted-foreground text-xs">
        {t.rich("description", {
          x: (chunks) => (
            <span className="font-semibold" style={{ color: team1 }}>
              {chunks}
            </span>
          ),
          z: (chunks) => (
            <span className="font-semibold" style={{ color: team2 }}>
              {chunks}
            </span>
          ),
        })}
      </p>
      <form onSubmit={handleAdd} className="space-y-2">
        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs" htmlFor="previewX">
              {t("worldX")}
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
              {t("worldZ")}
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
              {t("label")}
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
            {t("addTestPoint")}
          </Button>
          {pointCount > 0 && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearPoints}
            >
              {t("clear", { count: pointCount })}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
