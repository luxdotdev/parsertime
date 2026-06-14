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
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  const t = useTranslations("scrimPage.mapWinnerDialog");
  const [selected, setSelected] = useState<string>(currentWinner ?? "");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Reset the selection to the current winner whenever the dialog closes, since
  // the dialog stays mounted and useState would otherwise go stale.
  useEffect(() => {
    if (!open) {
      setSelected(currentWinner ?? "");
    }
  }, [open, currentWinner]);

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
        throw new Error(errBody.error ?? t("error"));
      }

      toast.success(t("success"));
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t.rich("description", {
              mapName,
              strong: (chunks) => <strong>{chunks}</strong>,
            })}
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
            {t("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!selected || loading}>
            {loading && <ReloadIcon className="mr-2 size-4 animate-spin" />}
            {t("save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
