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
import { track } from "@vercel/analytics";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { User } from "@prisma/client";
import { useTranslations } from "next-intl";

export function CommandDialogMenu({ user }: { user: User | null }) {
  const t = useTranslations("dashboard");
  const { open, setOpen } = use(CommandMenuContext);
  const [teams, setTeams] = useState<{ label: string; value: string }[]>([]);
  const router = useRouter();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

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
      <CommandInput
        placeholder=/* "Type a command or search..." */ {t(
          "commandMenu.searchPlaceholder"
        )}
      />
      <CommandList>
        <CommandEmpty>
          {/* No results found. */}
          {t("commandMenu.searchResult")}
        </CommandEmpty>
        <CommandGroup
          heading=/* "Suggestions" */ {t("commandMenu.suggestions.title")}
        >
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
          >
            <DashboardIcon className="mr-2 h-4 w-4" />
            <span>
              {/* Dashboard */}
              {t("commandMenu.suggestions.dashboard")}
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.open("https://docs.parsertime.app", "_blank")
              )
            }
          >
            <ReaderIcon className="mr-2 h-4 w-4" />
            <span>
              {/* Docs */}
              {t("commandMenu.suggestions.docs")}
            </span>
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
            <span>
              {/* Sign In */}
              {t("commandMenu.suggestions.signIn")}
            </span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <HomeIcon className="mr-2 h-4 w-4" />
            <span>
              {/* Home */}
              {t("commandMenu.suggestions.home")}
            </span>
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
                      title: /* "Link Copied" */ t("commandMenu.link.title"),
                      description: /* `The link to this */ `${t("commandMenu.link.description1")} ${pathname.includes("/map") ? "map" : "scrim"} ${t("commandMenu.link.description2")}` /*has been copied.*/,
                      duration: 5000,
                    });
                  })
                }
              >
                <Share2Icon className="mr-2 h-4 w-4" />
                <span>
                  {/* Share Link to */}
                  {t("commandMenu.link.share")}{" "}
                  {pathname.includes("/map") ? "Map" : "Scrim"}
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {teams.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading=/* "Teams" */ {t("commandMenu.teams.title")}>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/team"))}
              >
                <PersonIcon className="mr-2 h-4 w-4" />
                <span>
                  {/* View Teams */}
                  {t("commandMenu.teams.viewTeams")}
                </span>
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
                  <span>
                    {/* View Scrims: */}
                    {t("commandMenu.teams.viewScrims")} {team.label}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup
          heading=/* "Settings" */ {t("commandMenu.settings.title")}
        >
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>
              {/* Profile */}
              {t("commandMenu.settings.profile")}
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings/accounts"))}
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>
              {/* Linked Accounts */}
              {t("commandMenu.settings.linkedAccounts")}
            </span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading=/* "Reporting" */ {t("commandMenu.report.title")}>
          <CommandItem onSelect={() => setReportDialogOpen(true)}>
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <>
                  <ExclamationTriangleIcon className="mr-2 h-4 w-4" />
                  <span>
                    {/* Report a Bug */}
                    {t("commandMenu.report.description")}
                  </span>
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
        <CommandGroup
          heading=/* "Feedback" */ {t("commandMenu.feedback.title")}
        >
          <CommandItem
            onSelect={() => runCommand(() => router.push("/contact"))}
          >
            <EnvelopeOpenIcon className="mr-2 h-4 w-4" />
            <span>
              {/* Contact Us */}
              {t("commandMenu.feedback.description")}
            </span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.open("https://discord.gg/svz3qhVDXM", "_blank")
              )
            }
          >
            <DiscordLogoIcon className="mr-2 h-4 w-4" />
            <span>
              {/* Community Discord */}
              {t("commandMenu.feedback.discord")}
            </span>
            <CommandShortcut>
              <ExternalLinkIcon />
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading=/* "Theme" */ {t("commandMenu.theme.title")}>
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <SunIcon className="mr-2 h-4 w-4" />
            {/* Light */}
            {t("commandMenu.theme.light")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <MoonIcon className="mr-2 h-4 w-4" />
            {/* Dark */}
            {t("commandMenu.theme.dark")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <LaptopIcon className="mr-2 h-4 w-4" />
            {/* System */}
            {t("commandMenu.theme.system")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
