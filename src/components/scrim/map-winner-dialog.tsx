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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ReloadIcon } from "@radix-ui/react-icons";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

type MapWinnerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapId: number;
  mapName: string;
  team1Name: string;
  team2Name: string;
  currentWinner?: string | null;
};

export function MapWinnerDialog({
  open,
  onOpenChange,
  mapId,
  mapName,
  team1Name,
  team2Name,
  currentWinner,
}: MapWinnerDialogProps) {
  const [selected, setSelected] = useState<string>(currentWinner ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    if (!selected) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/scrim/map/${mapId}/set-winner`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner: selected }),
      });

      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        throw new Error(errBody.error ?? "Failed to set winner");
      }

      toast.success("Winner updated");
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to set winner"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Set Map Winner</DialogTitle>
          <DialogDescription>
            Choose the winning team for <strong>{mapName}</strong>. This
            overrides any automatically detected result.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setSelected}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value={team1Name} id="scrim-winner-team1" />
            <Label htmlFor="scrim-winner-team1">{team1Name}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value={team2Name} id="scrim-winner-team2" />
            <Label htmlFor="scrim-winner-team2">{team2Name}</Label>
          </div>
        </RadioGroup>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || loading}>
            {loading && <ReloadIcon className="mr-2 size-4 animate-spin" />}
            Save Winner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
