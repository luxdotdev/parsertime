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

type WinnerSelectorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tournamentMapId: number;
  mapName: string;
  team1Name: string;
  team2Name: string;
};

export function WinnerSelectorDialog({
  open,
  onOpenChange,
  tournamentMapId,
  mapName,
  team1Name,
  team2Name,
}: WinnerSelectorDialogProps) {
  const [selected, setSelected] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleConfirm() {
    if (!selected) return;

    setLoading(true);
    try {
      const res = await fetch(
        `/api/tournament/map/${tournamentMapId}/set-winner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ winner: selected }),
        }
      );

      if (!res.ok) {
        const errBody = (await res.json()) as { error?: string };
        throw new Error(errBody.error ?? "Failed to set winner");
      }

      toast.success("Winner set successfully");
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
          <DialogTitle>Select Map Winner</DialogTitle>
          <DialogDescription>
            The winner of <strong>{mapName}</strong> could not be determined
            automatically. This may happen with Push maps or if data is
            incomplete. Please select the winning team.
          </DialogDescription>
        </DialogHeader>

        <RadioGroup value={selected} onValueChange={setSelected}>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value={team1Name} id="team1" />
            <Label htmlFor="team1">{team1Name}</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value={team2Name} id="team2" />
            <Label htmlFor="team2">{team2Name}</Label>
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
            Confirm Winner
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
