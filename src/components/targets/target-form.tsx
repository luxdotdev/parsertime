"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  type RoleName,
  TARGET_STATS,
  getDefaultDirection,
  getStatsForRole,
} from "@/lib/target-stats";
import type { PlayerTarget } from "@/generated/prisma/browser";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState } from "react";

type Props = {
  teamId: number;
  playerName: string;
  playerRole?: RoleName;
  existingTarget?: PlayerTarget;
  preselectedStat?: string;
  trigger?: React.ReactNode;
};

export function TargetForm({
  teamId,
  playerName,
  playerRole,
  existingTarget,
  preselectedStat,
  trigger,
}: Props) {
  const t = useTranslations("targets");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const availableStats = playerRole
    ? getStatsForRole(playerRole)
    : TARGET_STATS;

  const [stat, setStat] = useState(
    existingTarget?.stat ?? preselectedStat ?? availableStats[0]?.key ?? ""
  );
  const [direction, setDirection] = useState<"increase" | "decrease">(
    (existingTarget?.targetDirection as "increase" | "decrease") ??
      getDefaultDirection(stat)
  );
  const [percent, setPercent] = useState(
    existingTarget?.targetPercent?.toString() ?? "10"
  );
  const [scrimWindow, setScrimWindow] = useState(
    existingTarget?.scrimWindow?.toString() ?? "10"
  );
  const [note, setNote] = useState(existingTarget?.note ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (existingTarget) {
        await fetch(`/api/team/targets/${existingTarget.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            targetDirection: direction,
            targetPercent: parseFloat(percent),
            scrimWindow: parseInt(scrimWindow),
            note: note || null,
          }),
        });
      } else {
        await fetch("/api/team/targets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            teamId,
            playerName,
            stat,
            targetDirection: direction,
            targetPercent: parseFloat(percent),
            scrimWindow: parseInt(scrimWindow),
            note: note || undefined,
          }),
        });
      }

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" size="sm">
            {existingTarget ? t("editTarget") : t("setTarget")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {existingTarget
                ? t("form.editTitle", { playerName })
                : t("form.title", { playerName })}
            </DialogTitle>
            <DialogDescription>{t("form.description")}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="stat">{t("form.stat")}</Label>
              <Select
                value={stat}
                onValueChange={(val) => {
                  setStat(val);
                  setDirection(getDefaultDirection(val));
                }}
                disabled={!!existingTarget}
              >
                <SelectTrigger id="stat" className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableStats.map((s) => (
                    <SelectItem key={s.key} value={s.key}>
                      {t(`stats.${s.key}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="direction">{t("form.direction")}</Label>
              <Select
                value={direction}
                onValueChange={(val) =>
                  setDirection(val as "increase" | "decrease")
                }
              >
                <SelectTrigger id="direction" className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="increase">{t("form.increase")}</SelectItem>
                  <SelectItem value="decrease">{t("form.decrease")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="percent">{t("form.targetPercent")}</Label>
              <Input
                id="percent"
                type="number"
                min="0.1"
                max="100"
                step="0.1"
                value={percent}
                onChange={(e) => setPercent(e.target.value)}
                className="text-base"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="scrimWindow">{t("form.scrimWindow")}</Label>
              <Select value={scrimWindow} onValueChange={setScrimWindow}>
                <SelectTrigger id="scrimWindow" className="text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">{t("form.last5")}</SelectItem>
                  <SelectItem value="10">{t("form.last10")}</SelectItem>
                  <SelectItem value="15">{t("form.last15")}</SelectItem>
                  <SelectItem value="20">{t("form.last20")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">{t("form.note")}</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t("form.notePlaceholder")}
                className="text-base"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={loading}>
              {loading
                ? t("saving")
                : existingTarget
                  ? t("updateTarget")
                  : t("createTarget")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
