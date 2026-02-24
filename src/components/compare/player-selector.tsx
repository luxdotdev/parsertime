"use client";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronsUpDown, User } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

type PlayerSelectorProps = {
  teamId: number;
  mapIds: number[];
  value: string | null;
  onChange: (player: string | null) => void;
};

type Player = {
  name: string;
  id: number;
  mapCount: number;
};

async function fetchTeamPlayers(
  teamId: number,
  mapIds: number[]
): Promise<Player[]> {
  const params = new URLSearchParams({
    teamId: teamId.toString(),
  });

  if (mapIds.length > 0) {
    params.set("mapIds", JSON.stringify(mapIds));
  }

  const response = await fetch(`/api/compare/players?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to fetch team players");
  }
  const data = (await response.json()) as { players: Player[] };
  return data.players;
}

export function PlayerSelector({
  teamId,
  mapIds,
  value,
  onChange,
}: PlayerSelectorProps) {
  const t = useTranslations("comparePage.playerSelector");
  const [open, setOpen] = useState(false);

  const { data: players, isLoading } = useQuery({
    queryKey: ["team-players", teamId, mapIds],
    queryFn: () => fetchTeamPlayers(teamId, mapIds),
    staleTime: 10 * 60 * 1000,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-auto min-h-9 w-full justify-between px-3 py-1.5"
        >
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 opacity-50" />
            <span className="flex-1 overflow-hidden text-left">
              {value ?? t("placeholder")}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0" align="start">
        <Command>
          <CommandInput placeholder={t("search")} />
          <CommandEmpty>
            {isLoading ? t("loading") : t("noPlayerFound")}
          </CommandEmpty>
          <CommandGroup className="max-h-[300px] overflow-y-auto">
            {players?.map((player) => (
              <CommandItem
                key={player.name}
                value={player.name}
                onSelect={() => {
                  onChange(player.name);
                  setOpen(false);
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    value === player.name ? "opacity-100" : "opacity-0"
                  )}
                />
                <div className="flex flex-1 items-center justify-between">
                  <span>{player.name}</span>
                  <span className="text-muted-foreground text-xs">
                    {t("mapCount", { count: player.mapCount })}
                  </span>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
