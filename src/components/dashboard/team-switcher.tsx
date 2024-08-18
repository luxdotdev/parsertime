"use client";

import {
  CaretSortIcon,
  CheckIcon,
  PlusCircledIcon,
} from "@radix-ui/react-icons";
import * as React from "react";

import { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { CreateTeamDialog } from "@/components/dashboard/create-team-dialog";
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
import { Session } from "next-auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import { useTranslations } from "next-intl";

type PopoverTriggerProps = React.ComponentPropsWithoutRef<
  typeof PopoverTrigger
>;

interface TeamSwitcherProps extends PopoverTriggerProps {}

type Team = { label: string; value: string; image: string | null };

export function TeamSwitcher({
  className,
  session,
}: TeamSwitcherProps & { session: Session | null }) {
  const [teams, setTeams] = React.useState<Team[]>([]);
  const [newTeamCreated, setNewTeamCreated] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams()!;
  const { setTeamId } = React.use(TeamSwitcherContext);
  const t = useTranslations("dashboard");

  function getTeams() {
    fetch("/api/team/get-teams")
      .then((res) => res.json() as Promise<GetTeamsResponse>)
      .then((data) => {
        const newTeams = data.teams.map((team) => ({
          label: team.name,
          value: team.id.toString(),
          image: team.image,
        }));
        setTeams(newTeams);
      });
  }

  React.useEffect(() => {
    getTeams();
  }, []);

  React.useEffect(() => {
    if (newTeamCreated) {
      getTeams();
      setNewTeamCreated(false);
    }
  }, [newTeamCreated]);

  const groups = [
    {
      label: /* "Individual" */ t("teamSwitcher.individual"),
      teams: [
        {
          label: session?.user?.name ?? "Individual",
          value: "individual",
          image: session?.user?.image ?? null,
        },
      ],
    },
    {
      label: /* "Teams" */ t("teamSwitcher.teams"),
      teams,
    },
  ];

  const [open, setOpen] = React.useState(false);
  const [showNewTeamDialog, setShowNewTeamDialog] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState(groups[0].teams[0]);

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
            {selectedTeam.label}
            <CaretSortIcon className="ml-auto h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandList>
              <CommandInput
                placeholder=/* "Search team..." */ {t(
                  "teamSwitcher.searchTeamPlaceholder"
                )}
              />
              <CommandEmpty>
                {/* No team found. */}
                {t("teamSwitcher.noTeamFound")}
              </CommandEmpty>
              {groups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.teams.map((team) => (
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
                      setOpen(false);
                      setShowNewTeamDialog(true);
                    }}
                  >
                    <PlusCircledIcon className="mr-2 h-5 w-5" />
                    {/* Create Team */}
                    {t("teamSwitcher.createTeam")}
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
