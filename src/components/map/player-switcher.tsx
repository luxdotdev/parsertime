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
import { cn, toHero } from "@/lib/utils";
import { type HeroName, heroPriority, heroRoleMapping } from "@/types/heroes";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "next/navigation";
import * as React from "react";

type TeamGroup = {
  label: string;
  players: { label: string; value: string }[];
};

type Player = {
  label: string;
  value: string;
};

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

type TeamSwitcherProps = {} & PopoverTriggerProps;

type MostPlayedHeroesType = {
  player_team: string;
  player_name: string;
  player_hero: string;
  hero_time_played: number;
}[];

export function PlayerSwitcher({
  className,
  mostPlayedHeroes,
}: TeamSwitcherProps & {
  mostPlayedHeroes: MostPlayedHeroesType;
}) {
  const t = useTranslations("mapPage.playerSwitcher");

  const [open, setOpen] = React.useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player>(() => ({
    label: t("default"),
    value: "default",
  }));

  const router = useRouter();
  const pathname = usePathname();

  const mapUrl =
    pathname.split("/")[1] === "demo"
      ? "/demo"
      : (pathname.split("/").slice(0, 6).join("/") as Route);

  React.useEffect(() => {
    const playerId = decodeURIComponent(pathname.split("/").pop()!);
    if (playerId) {
      const player = mostPlayedHeroes.find(
        (player) => player.player_name === playerId
      );
      if (player) {
        setSelectedPlayer({
          label: player.player_name,
          value: player.player_hero,
        });
      }
    }
  }, [mostPlayedHeroes, pathname]);

  function createTeamGroups(playerStats: MostPlayedHeroesType): TeamGroup[] {
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
        value: playerStat.player_hero,
      });
    });

    // Convert the map to an array
    return Array.from(teamGroupsMap.values());
  }

  const teams = createTeamGroups(
    mostPlayedHeroes
      .sort((a, b) => a.player_name.localeCompare(b.player_name))
      .sort(
        (a, b) =>
          heroPriority[heroRoleMapping[a.player_hero as HeroName]] -
          heroPriority[heroRoleMapping[b.player_hero as HeroName]]
      )
  ).sort((a, b) => a.label.localeCompare(b.label));

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label={t("select")}
            className={cn("w-[200px] justify-between", className)}
          >
            <Avatar className="mr-2 h-5 w-5">
              <AvatarImage
                src={`/heroes/${toHero(selectedPlayer.value)}.png`}
                alt={selectedPlayer.label}
              />
              <AvatarFallback>PT</AvatarFallback>
            </Avatar>
            {selectedPlayer.label}
            <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder={t("search")} />
              <CommandEmpty>{t("noPlayerFound")}</CommandEmpty>
              {teams.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.players.map((player) => (
                    <CommandItem
                      key={player.label}
                      onSelect={() => {
                        router.push(
                          `${mapUrl}/player/${player.label}` as Route
                        );
                      }}
                      className="text-sm"
                    >
                      <Avatar className="mr-2 h-5 w-5">
                        <AvatarImage
                          src={`/heroes/${toHero(player.value)}.png`}
                          alt={player.label}
                          // className="grayscale"
                        />
                        <AvatarFallback>PT</AvatarFallback>
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
                      router.push(mapUrl);
                      setSelectedPlayer({
                        label: t("default"),
                        value: "default",
                      });
                    }}
                  >
                    <Avatar className="mr-2 h-5 w-5">
                      <AvatarImage
                        src="/heroes/default.png"
                        alt={t("default")}
                      />
                      <AvatarFallback>PT</AvatarFallback>
                    </Avatar>
                    {t("default")}
                    <CheckIcon
                      className={cn(
                        "ml-auto h-4 w-4",
                        selectedPlayer.label === t("default")
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

type PlayerContextType = {
  selectedPlayer: Player;
  setSelectedPlayer: React.Dispatch<React.SetStateAction<Player>>;
};

export const SelectedPlayerContext = React.createContext<PlayerContextType>({
  selectedPlayer: {
    label: "Default",
    value: "default",
  },
  setSelectedPlayer: () => {
    // empty function
  },
});

export function SelectedPlayerProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedPlayer, setSelectedPlayer] = React.useState<Player>({
    label: "Default",
    value: "default",
  });

  const value = React.useMemo(
    () => ({
      selectedPlayer,
      setSelectedPlayer,
    }),
    [selectedPlayer, setSelectedPlayer]
  );

  return (
    <SelectedPlayerContext value={value}>{children}</SelectedPlayerContext>
  );
}
