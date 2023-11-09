"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ParserDataContext } from "@/lib/parser-context";
import { cn, toHero } from "@/lib/utils";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import * as React from "react";
import { PlayerStatTableRow } from "../../../types/parser";

interface TeamGroup {
  label: string;
  players: { label: string; value: string }[];
}

interface Player {
  label: string;
  value: string;
}

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface TeamSwitcherProps extends PopoverTriggerProps {}

type ReducedPlayerStat = {
  player_name: string;
  player_team: string;
  most_played_hero: string;
  time_played: number;
};

export default function PlayerSwitcher({ className }: TeamSwitcherProps) {
  const [open, setOpen] = React.useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player>({
    label: "Default (No Team)",
    value: "default",
  });

  const { data } = React.useContext(ParserDataContext);

  function getMostPlayedHeroes(
    playerRawStats: PlayerStatTableRow[]
  ): ReducedPlayerStat[] {
    const playerHeroTimes: {
      [playerName: string]: { [heroName: string]: number };
    } = {};

    playerRawStats.forEach((stat) => {
      const playerName: string = stat[4];
      const heroName: string = stat[5];
      const heroTimePlayed = stat[stat.length - 1] as number; // Corrected to the last element for "hero time played"

      if (!playerHeroTimes[playerName]) {
        playerHeroTimes[playerName] = {};
      }

      if (!playerHeroTimes[playerName][heroName]) {
        playerHeroTimes[playerName][heroName] = 0;
      }

      playerHeroTimes[playerName][heroName] += heroTimePlayed;
    });

    const mostPlayedHeroes: ReducedPlayerStat[] = Object.keys(
      playerHeroTimes
    ).map((playerName) => {
      const heroes = playerHeroTimes[playerName];
      let mostPlayedHero = "";
      let maxTime = 0;

      Object.entries(heroes).forEach(([heroName, timePlayed]) => {
        if (timePlayed > maxTime) {
          maxTime = timePlayed;
          mostPlayedHero = heroName;
        }
      });

      // Find any stat entry for this player to get their team name
      const playerTeam =
        playerRawStats.find((stat) => stat[4] === playerName)?.[3] || "Unknown";

      return {
        player_name: playerName,
        player_team: playerTeam,
        most_played_hero: mostPlayedHero,
        time_played: maxTime,
      };
    });

    return mostPlayedHeroes;
  }

  function createTeamGroups(playerStats: ReducedPlayerStat[]): TeamGroup[] {
    const teamGroupsMap = new Map<string, TeamGroup>();

    // Organize player stats by team
    playerStats.forEach((playerStat) => {
      let teamGroup = teamGroupsMap.get(playerStat.player_team);

      // If the team doesn't exist in the map, create it
      if (!teamGroup) {
        teamGroup = { label: playerStat.player_team, players: [] };
        teamGroupsMap.set(playerStat.player_team, teamGroup);
      }

      // Add the player and their most played hero to the team
      teamGroup.players.push({
        label: playerStat.player_name,
        value: playerStat.most_played_hero,
      });
    });

    // Convert the map to an array
    return Array.from(teamGroupsMap.values());
  }

  const playerStats = getMostPlayedHeroes(data.player_stat);
  const teams = createTeamGroups(playerStats).sort((a, b) =>
    a.label.localeCompare(b.label)
  );

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a player"
            className={cn("w-[200px] justify-between", className)}
          >
            <Avatar className="mr-2 h-5 w-5">
              <AvatarImage
                src={`/heroes/${toHero(selectedPlayer.value)}.png`}
                alt={selectedPlayer.label}
              />
              <AvatarFallback>SC</AvatarFallback>
            </Avatar>
            {selectedPlayer.label}
            <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search player..." />
              <CommandEmpty>No player found.</CommandEmpty>
              {teams.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.players.map((player) => (
                    <CommandItem
                      key={player.label}
                      onSelect={() => {
                        setSelectedPlayer(player);
                      }}
                      className="text-sm"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage
                          src={`/heroes/${toHero(player.value)}.png`}
                          alt={player.label}
                          // className="grayscale"
                        />
                        <AvatarFallback>SC</AvatarFallback>
                      </Avatar>
                      {player.label} {/* Use player.label directly here */}
                      <CheckIcon
                        className={cn(
                          "ml-auto h-4 w-4",
                          selectedPlayer.label === player.label
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setSelectedPlayer({
                        label: "Default (No Team)",
                        value: "default",
                      });
                    }}
                  >
                    <Avatar className="mr-2 h-5 w-5">
                      <AvatarImage
                        src={`/heroes/default.png`}
                        alt={"Default (No Team)"}
                        // className="grayscale"
                      />
                      <AvatarFallback>SC</AvatarFallback>
                    </Avatar>
                    Default (No Team)
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedPlayer.label === "Default (No Team)"
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </Dialog>
  );
}
