"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useColorblindMode } from "@/hooks/use-colorblind-mode";
import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";

type AnchorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageU: number;
  imageV: number;
  onSubmit: (data: {
    worldX: number;
    worldY: number;
    imageU: number;
    imageV: number;
    label?: string;
  }) => void;
};

export function AnchorDialog({
  open,
  onOpenChange,
  imageU,
  imageV,
  onSubmit,
}: AnchorDialogProps) {
  const t = useTranslations("mapCalibrationPage.anchorDialog");
  const formatter = useFormatter();
  const { team1, team2 } = useColorblindMode();
  const [worldX, setWorldX] = useState("");
  const [worldY, setWorldY] = useState("");
  const [label, setLabel] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const x = parseFloat(worldX);
    const y = parseFloat(worldY);
    if (isNaN(x) || isNaN(y)) return;

    onSubmit({
      worldX: x,
      worldY: y,
      imageU,
      imageV,
      label: label.trim() || undefined,
    });

    setWorldX("");
    setWorldY("");
    setLabel("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t.rich("description", {
              imageU: formatter.number(imageU),
              imageV: formatter.number(imageV),
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
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="worldX">{t("worldX")}</Label>
              <Input
                id="worldX"
                name="worldX"
                type="number"
                step="any"
                autoComplete="off"
                value={worldX}
                onChange={(e) => setWorldX(e.target.value)}
                placeholder={t("worldXPlaceholder")}
                // oxlint-disable-next-line jsx-a11y/no-autofocus -- intentional focus management in dialog
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worldY">{t("worldZ")}</Label>
              <Input
                id="worldY"
                name="worldY"
                type="number"
                step="any"
                autoComplete="off"
                value={worldY}
                onChange={(e) => setWorldY(e.target.value)}
                placeholder={t("worldZPlaceholder")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">{t("label")}</Label>
            <Input
              id="label"
              name="anchorLabel"
              autoComplete="off"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder={t("labelPlaceholder")}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={!worldX || !worldY}>
              {t("addAnchor")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
