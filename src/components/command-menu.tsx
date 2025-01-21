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
import { locales } from "@/i18n/config";
import { setUserLocale } from "@/lib/locale";
import { User } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { track } from "@vercel/analytics";
import { useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { use, useCallback, useState } from "react";

export function CommandDialogMenu({ user }: { user: User | null }) {
  const { open, setOpen } = use(CommandMenuContext);
  const router = useRouter();
  const { setTheme } = useTheme();
  const pathname = usePathname();
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const t = useTranslations("dashboard.commandMenu");

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
    queryKey: ["cmd-menu-teams"],
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
      <CommandInput placeholder={t("searchPlaceholder")} />
      <CommandList>
        <CommandEmpty>{t("searchResult")}</CommandEmpty>
        <CommandGroup heading={t("suggestions.title")}>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/dashboard"))}
          >
            <DashboardIcon className="mr-2 h-4 w-4" />
            <span>{t("suggestions.dashboard")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.open("https://docs.parsertime.app", "_blank")
              )
            }
          >
            <ReaderIcon className="mr-2 h-4 w-4" />
            <span>{t("suggestions.docs")}</span>
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
            <span>{t("suggestions.signIn")}</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/"))}>
            <HomeIcon className="mr-2 h-4 w-4" />
            <span>{t("suggestions.home")}</span>
          </CommandItem>
        </CommandGroup>
        {pathname.includes("/scrim/") && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("scrim.title")}>
              <CommandItem
                onSelect={() =>
                  runCommand(() => {
                    let link = window.location.href;
                    if (link.includes("/edit")) {
                      link = link.split("/edit")[0];
                    }
                    void navigator.clipboard.writeText(link);
                    toast({
                      title: t("link.title"),
                      description: t("link.description", {
                        pathname: pathname.includes("/map")
                          ? t("link.map")
                          : t("link.scrim"),
                      }),
                      duration: 5000,
                    });
                  })
                }
              >
                <Share2Icon className="mr-2 h-4 w-4" />
                <span>
                  {t("link.share", {
                    pathname: pathname.includes("/map")
                      ? t("link.map")
                      : t("link.scrim"),
                  })}
                </span>
              </CommandItem>
            </CommandGroup>
          </>
        )}
        {teams && teams.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={t("teams.title")}>
              <CommandItem
                onSelect={() => runCommand(() => router.push("/team"))}
              >
                <PersonIcon className="mr-2 h-4 w-4" />
                <span>{t("teams.viewTeams")}</span>
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
                  <span>{t("teams.viewScrims", { team: team.label })}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
        <CommandSeparator />
        <CommandGroup heading={t("settings.title")}>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings"))}
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>{t("settings.profile")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() => runCommand(() => router.push("/settings/accounts"))}
          >
            <PersonIcon className="mr-2 h-4 w-4" />
            <span>{t("settings.linkedAccounts")}</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("debugging.title")}>
          <CommandItem onSelect={() => runCommand(() => router.push("/debug"))}>
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <>
                  <MagicWandIcon className="mr-2 h-4 w-4" />
                  <span>{t("debugging.assistant")}</span>
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
        <CommandGroup heading={t("feedback.title")}>
          <CommandItem onSelect={() => setReportDialogOpen(true)}>
            <Dialog open={reportDialogOpen} onOpenChange={setReportDialogOpen}>
              <DialogTrigger asChild>
                <>
                  <ExclamationTriangleIcon className="mr-2 h-4 w-4" />
                  <span>{t("feedback.bugReport")}</span>
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
            <span>{t("feedback.contact")}</span>
          </CommandItem>
          <CommandItem
            onSelect={() =>
              runCommand(() =>
                window.open("https://discord.gg/svz3qhVDXM", "_blank")
              )
            }
          >
            <DiscordLogoIcon className="mr-2 h-4 w-4" />
            <span>{t("feedback.discord")}</span>
            <CommandShortcut>
              <ExternalLinkIcon />
            </CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("locale.title")}>
          {locales.map((locale) => (
            <CommandItem
              key={locale.code}
              onSelect={() =>
                runCommand(async () => {
                  await setUserLocale(locale.code);
                  router.refresh();
                })
              }
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mr-2 h-4 w-4"
              >
                <path d="m5 8 6 6" />
                <path d="m4 14 6-6 2-3" />
                <path d="M2 5h12" />
                <path d="M7 2h1" />
                <path d="m22 22-5-10-5 10" />
                <path d="M14 18h6" />
              </svg>
              <span>{t("locale.change", { locale: locale.name })}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading={t("theme.title")}>
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <SunIcon className="mr-2 h-4 w-4" />
            {t("theme.light")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <MoonIcon className="mr-2 h-4 w-4" />
            {t("theme.dark")}
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <LaptopIcon className="mr-2 h-4 w-4" />
            {t("theme.system")}
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
