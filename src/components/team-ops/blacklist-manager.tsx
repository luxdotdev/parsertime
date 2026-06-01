"use client";

import {
  AddBlacklistField,
  type BlacklistSelection,
} from "@/components/team-ops/add-blacklist-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  BlacklistRow,
  BlacklistSuggestion,
} from "@/lib/team-ops/blacklist";
import { cn } from "@/lib/utils";
import { MinusCircledIcon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

type BlacklistManagerProps = {
  teamId: number;
  rows: BlacklistRow[];
  suggestions: BlacklistSuggestion[];
};

export function BlacklistManager({
  teamId,
  rows,
  suggestions,
}: BlacklistManagerProps) {
  const t = useTranslations("teamOps.blacklist");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [pendingSelection, setPendingSelection] =
    useState<BlacklistSelection | null>(null);
  const [reason, setReason] = useState("");

  function handleSelect(s: BlacklistSelection) {
    setPendingSelection(s);
    setReason("");
  }

  function handleCancel() {
    setPendingSelection(null);
    setReason("");
  }

  function handleAdd() {
    if (!pendingSelection) return;
    startTransition(async () => {
      const res = await fetch("/api/team-ops/blacklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerTeamId: teamId,
          blockedTeamId:
            pendingSelection.kind === "team" ? pendingSelection.teamId : null,
          blockedTeamName: pendingSelection.name,
          reason: reason.trim() || null,
        }),
      });
      if (!res.ok) {
        toast.error(t("addError"));
        return;
      }
      setPendingSelection(null);
      setReason("");
      router.refresh();
    });
  }

  function handleRemove(id: string) {
    startTransition(async () => {
      const res = await fetch("/api/team-ops/blacklist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ownerTeamId: teamId, id }),
      });
      if (!res.ok) {
        toast.error(t("removeError"));
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search / add field */}
      <AddBlacklistField suggestions={suggestions} onSelect={handleSelect} />

      {/* Pending confirmation panel */}
      {pendingSelection && (
        <div className="border-input bg-background rounded-md border p-4">
          <p className="text-foreground mb-3 text-sm font-medium">
            {t("blocking", { name: pendingSelection.name })}
          </p>
          <div className="flex flex-col gap-3">
            <Input
              placeholder={t("reasonPlaceholder")}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              disabled={isPending}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={isPending}
              >
                {t("confirmAdd")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isPending}
              >
                {t("cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Blacklist rows */}
      {rows.length === 0 ? (
        <p className="text-muted-foreground py-6 text-center text-sm">
          {t("empty")}
        </p>
      ) : (
        <ul className="border-input divide-input rounded-md border divide-y overflow-hidden">
          {rows.map((row) => (
            <li
              key={row.id}
              className={cn(
                "bg-background flex items-center gap-3 px-4 py-3",
                "hover:bg-accent/30 transition-colors duration-75"
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-foreground truncate text-sm font-medium">
                    {row.blockedTeamName}
                  </span>
                  {row.blockedTeamId != null ? (
                    <Badge variant="secondary">{t("onPlatform")}</Badge>
                  ) : (
                    <Badge variant="outline">{t("offPlatform")}</Badge>
                  )}
                </div>
                {row.reason && (
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {row.reason}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={t("removeNamed", { name: row.blockedTeamName })}
                disabled={isPending}
                onClick={() => handleRemove(row.id)}
                className="text-muted-foreground hover:text-destructive shrink-0"
              >
                <MinusCircledIcon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
