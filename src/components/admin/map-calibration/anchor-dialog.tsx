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
          <DialogTitle>Add Anchor Point</DialogTitle>
          <DialogDescription>
            Image position: ({imageU}, {imageV}). Enter the corresponding
            in-game world coordinates.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="worldX">World X</Label>
              <Input
                id="worldX"
                name="worldX"
                type="number"
                step="any"
                autoComplete="off"
                value={worldX}
                onChange={(e) => setWorldX(e.target.value)}
                placeholder="e.g. 42.5"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="worldY">World Y</Label>
              <Input
                id="worldY"
                name="worldY"
                type="number"
                step="any"
                autoComplete="off"
                value={worldY}
                onChange={(e) => setWorldY(e.target.value)}
                placeholder="e.g. -18.3"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="label">Label (optional)</Label>
            <Input
              id="label"
              name="anchorLabel"
              autoComplete="off"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Point A, Spawn door"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={!worldX || !worldY}>
              Add Anchor
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
