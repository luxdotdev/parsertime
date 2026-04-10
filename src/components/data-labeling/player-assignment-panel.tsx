"use client";

import { getEligiblePlayers } from "@/components/data-labeling/roster-role-utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { RosterPlayerForLabeling } from "@/data/admin/types";
import { toHero } from "@/lib/utils";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { useCallback } from "react";

type PlayerAssignmentPanelProps = {
  teamLabel: string;
  selectedHeroes: string[];
  roster: RosterPlayerForLabeling[];
  assignments: Record<string, string>;
  onAssignmentsChange: (assignments: Record<string, string>) => void;
};

export function PlayerAssignmentPanel({
  teamLabel,
  selectedHeroes,
  roster,
  assignments,
  onAssignmentsChange,
}: PlayerAssignmentPanelProps) {
  const t = useTranslations("dataLabeling.labeling");

  const handleAssign = useCallback(
    (heroName: string, playerName: string) => {
      onAssignmentsChange({ ...assignments, [heroName]: playerName });
    },
    [assignments, onAssignmentsChange]
  );

  if (selectedHeroes.length === 0 || roster.length === 0) return null;

  const assignedPlayers = new Set(Object.values(assignments));

  return (
    <div className="space-y-1.5">
      <h4 className="text-muted-foreground text-xs font-medium">
        {t("playerAssignments", {
          team: teamLabel,
          defaultMessage: `${teamLabel} Player Assignments`,
        })}
      </h4>
      <div className="space-y-1">
        {selectedHeroes.map((hero) => {
          const currentPlayer = assignments[hero];
          const eligible = getEligiblePlayers(hero, roster, currentPlayer);

          return (
            <div
              key={hero}
              className="flex h-10 items-center gap-2 rounded-md border px-2"
            >
              <Image
                src={`/heroes/${toHero(hero)}.png`}
                alt={hero}
                width={24}
                height={24}
                className="shrink-0 rounded-sm"
              />
              <span className="w-24 shrink-0 truncate text-sm">{hero}</span>
              <Select
                value={currentPlayer ?? ""}
                onValueChange={(value) => handleAssign(hero, value)}
              >
                <SelectTrigger
                  size="sm"
                  className="h-7 min-w-0 flex-1 text-xs"
                  aria-label={t("assignPlayer", {
                    hero,
                    defaultMessage: `Assign player for ${hero}`,
                  })}
                >
                  <SelectValue
                    placeholder={t("selectPlayer", {
                      defaultMessage: "Select player...",
                    })}
                  />
                </SelectTrigger>
                <SelectContent position="popper">
                  {eligible.map((player) => {
                    const isUsed =
                      assignedPlayers.has(player.displayName) &&
                      currentPlayer !== player.displayName;

                    return (
                      <SelectItem
                        key={player.id}
                        value={player.displayName}
                        disabled={isUsed}
                      >
                        <span className={isUsed ? "opacity-50" : ""}>
                          {player.displayName}
                        </span>
                        <span className="text-muted-foreground ml-1 text-[10px]">
                          {player.role}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
