"use client";

import {
  ChevronRightIcon,
  DashboardIcon,
  EnterIcon,
  ExternalLinkIcon,
  HomeIcon,
  LaptopIcon,
  MoonIcon,
  PersonIcon,
  ReaderIcon,
  SunIcon,
  DiscordLogoIcon,
  EnvelopeOpenIcon,
  Share2Icon,
} from "@radix-ui/react-icons";

import { GetTeamsResponse } from "@/app/api/team/get-teams/route";
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
import { track } from "@vercel/analytics";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { CommandMenuContext } from "@/components/command-menu-provider";
import { use, useCallback, useEffect, useState } from "react";
import { toast } from "@/components/ui/use-toast";

export function CommandDialogMenu() {
  const { open, setOpen } = use(CommandMenuContext);
  const [teams, setTeams] = useState<{ label: string; value: string }[]>([]);
  const router = useRouter();
  const { setTheme } = useTheme();
  const pathname = usePathname();

  function getTeams() {
    fetch("/api/team/get-teams")
      .then((res) => res.json() as Promise<GetTeamsResponse>)
      .then((data) => {
        const newTeams = data.teams.map((team) => ({
          label: team.name,
          value: team.id.toString(),
        }));
        setTeams(newTeams);
      });
  }

  useEffect(() => {
    getTeams();
  }, []);

  const runCommand = useCallback(
    (command: () => unknown) => {
      setOpen(false);
      command();
    },
    [setOpen]
  );

  return (
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
            onSelect={() =>
              runCommand(() =>
                window.open("https://docs.parsertime.app", "_blank")
              )
            }
          >
            <ReaderIcon className="mr-2 h-4 w-4" />
            <span>Docs</span>
            <CommandShortcut>
              <ExternalLinkIcon />
            </CommandShortcut>
          </CommandItem>
          <CommandItem
            onSelect={() => {
              track("Sign In", { location: "Command Menu" });
              runCommand(() => router.push("/sign-in"));
            }}
          >
            <EnterIcon className="mr-2 h-4 w-4" />
            <span>Sign In</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <HomeIcon className="mr-2 h-4 w-4" />
            <span>Home</span>
          </CommandItem>
        </CommandGroup>
        {pathname.includes("/scrim/") && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Scrim">
              <CommandItem
                onSelect={() =>
                  runCommand(() => {
                    let link = window.location.href;
                    if (link.includes("/edit")) {
                      link = link.split("/edit")[0];
                    }
                    navigator.clipboard.writeText(link);
                    toast({
                      title: "Link Copied",
                      description: `The link to this ${pathname.includes("/map") ? "map" : "scrim"} has been copied.`,
                      duration: 5000,
                    });
                  })
                }
              >
                <Share2Icon className="mr-2 h-4 w-4" />
                <span>
                  Share Link to {pathname.includes("/map") ? "Map" : "Scrim"}
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {teams.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Teams">
              <CommandItem
                onSelect={() => runCommand(() => router.push("/team"))}
              >
                <PersonIcon className="mr-2 h-4 w-4" />
                <span>View Teams</span>
              </CommandItem>
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
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>Profile</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings/accounts"))}
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>Linked Accounts</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Feedback">
          <CommandItem
            onSelect={() => runCommand(() => router.push("/contact"))}
          >
            <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
            <span>Contact Us</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.open("https://discord.gg/svz3qhVDXM", "_blank")
              )
            }
          >
            <DiscordLogoIcon className="mr-2 h-4 w-4" />
            <span>Community Discord</span>
            <CommandShortcut>
              <ExternalLinkIcon />
            </CommandShortcut>
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
  );
}
