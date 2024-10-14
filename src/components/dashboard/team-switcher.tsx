"use client";

import {
  CaretSortIcon,
  CheckIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import * as React from "react";

import { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
import { TeamSwitcherContext } from "@/components/team-switcher-provider";
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
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Session } from "next-auth";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface TeamSwitcherProps extends PopoverTriggerProps {}

export function TeamSwitcher({
  className,
  session,
}: TeamSwitcherProps & { session: Session | null }) {
  const [newTeamCreated, setNewTeamCreated] = React.useState(false);
  const { setTeamId } = React.use(TeamSwitcherContext);

  async function getTeams() {
    const response = await fetch("/api/team/get-teams");
    if (!response.ok) {
      throw new Error("Failed to fetch teams");
    }
    const data = (await response.json()) as GetTeamsResponse;
    return data.teams.map((team) => ({
      label: team.name,
      value: team.id.toString(),
      image: team.image,
    }));
  }

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teamSwitcherTeams"],
    queryFn: getTeams,
    staleTime: Infinity,
  });

  const queryClient = useQueryClient();

  React.useEffect(() => {
    if (newTeamCreated) {
      void queryClient.invalidateQueries({ queryKey: ["teamSwitcherTeams"] });
      setNewTeamCreated(false);
    }
  }, [newTeamCreated, queryClient, setNewTeamCreated]);

  const groups = [
    {
      label: "Individual",
      teams: [
        {
          label: session?.user?.name ?? "Individual",
          value: "individual",
          image: session?.user?.image ?? null,
        },
      ],
    },
    {
      label: "Teams",
      teams,
    },
  ];

  const [open, setOpen] = React.useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState(groups[0].teams![0]);

  return (
    <Dialog open={showNewTeamDialog} onOpenChange={setShowNewTeamDialog}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Select a team"
            className={cn("w-[200px] justify-between", className)}
          >
            <Avatar className="mr-2 h-5 w-5">
              <AvatarImage
                src={
                  selectedTeam.image ??
                  `https://avatar.vercel.sh/${selectedTeam.value}.png`
                }
                alt={selectedTeam.label}
              />
              <AvatarFallback>PT</AvatarFallback>
            </Avatar>
            <p className="truncate">{selectedTeam.label}</p>
            <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput placeholder="Search team..." />
              <CommandEmpty>No team found.</CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {isLoading ? (
                    <CommandItem>Loading...</CommandItem>
                  ) : (
                    group.teams!.map((team) => (
                      <CommandItem
                        key={team.value}
                        onSelect={() => {
                          setSelectedTeam(team);
                          setTeamId(
                            team.value === "individual"
                              ? undefined
                              : parseInt(team.value)
                          );
                          setOpen(false);
                        }}
                        className="text-sm"
                      >
                        <Avatar className="mr-2 h-5 w-5">
                          <AvatarImage
                            src={
                              team.image ??
                              `https://avatar.vercel.sh/${team.label}.png`
                            }
                            alt={team.label}
                            className="grayscale"
                          />
                          <AvatarFallback>PT</AvatarFallback>
                        </Avatar>
                        {team.label}
                        <CheckIcon
                          className={cn(
                            "ml-auto h-4 w-4",
                            selectedTeam.value === team.value
                              ? "opacity-100"
                              : "opacity-0"
                          )}
                        />
                      </CommandItem>
                    ))
                  )}
                </CommandGroup>
              ))}
            </CommandList>
            <CommandSeparator />
            <CommandList>
              <CommandGroup>
                <DialogTrigger asChild>
                  <CommandItem
                    onSelect={() => {
                      setOpen(false);
                      setShowNewTeamDialog(true);
                    }}
                  >
                    <PlusCircledIcon className="mr-2 h-5 w-5" />
                    Create Team
                  </CommandItem>
                </DialogTrigger>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <CreateTeamDialog
        setShowNewTeamDialog={setShowNewTeamDialog}
        setNewTeamCreated={setNewTeamCreated}
      />
    </Dialog>
  );
}
