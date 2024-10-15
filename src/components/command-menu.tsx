"use client";

import {
  ChevronRightIcon,
  DashboardIcon,
  DiscordLogoIcon,
  EnterIcon,
  EnvelopeOpenIcon,
  ExclamationTriangleIcon,
  ExternalLinkIcon,
  HomeIcon,
  LaptopIcon,
  MagicWandIcon,
  MoonIcon,
  PersonIcon,
  ReaderIcon,
  Share2Icon,
  SunIcon,
} from "@radix-ui/react-icons";

import { GetTeamsResponse } from "@/app/api/team/get-teams/route";
import { BugReportForm } from "@/components/bug-reporting-form";
import { CommandMenuContext } from "@/components/command-menu-provider";
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
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { User } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { track } from "@vercel/analytics";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";

export function CommandDialogMenu({ user }: { user: User | null }) {
  const { open, setOpen } = use(CommandMenuContext);
  const router = useRouter();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  async function getTeams() {
    const response = await fetch("/api/team/get-teams");
    if (!response.ok) {
      throw new Error("Failed to fetch teams");
    }
    const data = (await response.json()) as GetTeamsResponse;
    return data.teams.map((team) => ({
      label: team.name,
      value: team.id.toString(),
    }));
  }

  const { data: teams } = useQuery({
    queryKey: ["teams"],
    queryFn: getTeams,
    staleTime: Infinity,
  });

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
                    void navigator.clipboard.writeText(link);
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
        {teams && teams.length > 0 && (
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
        <CommandGroup heading="Debugging">
          <CommandItem onSelect={() => runCommand(() => router.push("/debug"))}>
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <>
                  <MagicWandIcon className="mr-2 h-4 w-4" />
                  <span>Debugging Assistant</span>
                </>
              </DialogTrigger>
              <DialogContent>
                <BugReportForm
                  user={user}
                  setReportDialogOpen={setReportDialogOpen}
                />
              </DialogContent>
            </Dialog>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Feedback">
          <CommandItem onSelect={() => setReportDialogOpen(true)}>
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <>
                  <ExclamationTriangleIcon className="mr-2 h-4 w-4" />
                  <span>Report a Bug</span>
                </>
              </DialogTrigger>
              <DialogContent>
                <BugReportForm
                  user={user}
                  setReportDialogOpen={setReportDialogOpen}
                />
              </DialogContent>
            </Dialog>
          </CommandItem>
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
