"use client";

import {
  ChevronRightIcon,
  DashboardIcon,
  EnterIcon,
  EnvelopeClosedIcon,
  GearIcon,
  LaptopIcon,
  MoonIcon,
  PersonIcon,
  SunIcon,
} from "@radix-ui/react-icons";
import * as React from "react";

import { GetTeamsResponse } from "@/app/api/(team)/get-teams/route";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

export function CommandDialogMenu() {
  const [open, setOpen] = React.useState(false);
  const [teams, setTeams] = React.useState<{ label: string; value: string }[]>(
    []
  );
  const router = useRouter();
  const { setTheme } = useTheme();

  function getTeams() {
    fetch("/api/get-teams")
      .then((res) => res.json() as Promise<GetTeamsResponse>)
      .then((data) => {
        const newTeams = data.teams.map((team) => ({
          label: team.name,
          value: team.id.toString(),
        }));
        setTeams(newTeams);
      });
  }

  React.useEffect(() => {
    getTeams();
  }, []);

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Type a command or search..." />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem
              onSelect={() => runCommand(() => router.push("/dashboard"))}
            >
              <DashboardIcon className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/team"))}
            >
              <PersonIcon className="mr-2 h-4 w-4" />
              <span>Teams</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push("/sign-in"))}
            >
              <EnterIcon className="mr-2 h-4 w-4" />
              <span>Sign In</span>
            </CommandItem>
          </CommandGroup>
          {teams.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Teams">
                {teams.map((team) => (
                  <CommandItem
                    key={team.value}
                    onSelect={() =>
                      runCommand(() =>
                        router.push(`/dashboard?team=${team.value}`)
                      )
                    }
                  >
                    <ChevronRightIcon className="mr-2 h-4 w-4" />
                    <span>View Scrims: {team.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}
          <CommandSeparator />
          <CommandGroup heading="Settings">
            <CommandItem>
              <PersonIcon className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <EnvelopeClosedIcon className="mr-2 h-4 w-4" />
              <span>Mail</span>
              <CommandShortcut>⌘B</CommandShortcut>
            </CommandItem>
            <CommandItem>
              <GearIcon className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
              <SunIcon className="mr-2 h-4 w-4" />
              Light
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
              <MoonIcon className="mr-2 h-4 w-4" />
              Dark
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
              <LaptopIcon className="mr-2 h-4 w-4" />
              System
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
