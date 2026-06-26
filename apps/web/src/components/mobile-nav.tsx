"use client";

import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import type { Route } from "next";
import type { Session } from "@/lib/auth";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";

const mainNav: { labelKey: string; href: Route }[] = [
  { labelKey: "dashboard", href: "/dashboard" },
  { labelKey: "stats", href: "/stats" },
  { labelKey: "heroStats", href: "/stats/hero" },
  { labelKey: "mapStats", href: "/stats/map" },
  { labelKey: "compareStats", href: "/stats/compare" },
  { labelKey: "yourTeams", href: "/team" },
  { labelKey: "matchmaker", href: "/matchmaker" },
  { labelKey: "ranked", href: "/ranked" as Route },
  { labelKey: "settings", href: "/settings" },
  { labelKey: "contact", href: "/contact" },
  { labelKey: "docs", href: "https://docs.parsertime.app" },
];

export function MobileNav({
  session,
  aiChatEnabled,
  dataToolsEnabled,
  coachingCanvasEnabled,
  className,
}: {
  session: Session | null;
  aiChatEnabled?: boolean;
  dataToolsEnabled?: boolean;
  coachingCanvasEnabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("dashboard.mainNav");
  const [open, setOpen] = React.useState(false);
  const { teamId } = React.use(TeamSwitcherContext);
  const availabilityHref = (
    teamId !== undefined ? `/team/${teamId}/availability` : "/team"
  ) as Route;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0",
            className
          )}
        >
          <svg
            strokeWidth="1.5"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
          >
            <path
              d="M3 5H11"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
            <path
              d="M3 12H16"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
            <path
              d="M3 19H21"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            ></path>
          </svg>
          <span className="sr-only">{t("toggleMenu")}</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="pt-3 pr-0 pl-4">
        <TeamSwitcher session={session} />
        <div className="p-2" />
        <MobileLink
          href="/"
          className="flex items-center"
          onOpenChange={setOpen}
        >
          <Image
            src="/parsertime.png"
            alt="Parsertime"
            width={48}
            height={48}
            className="mr-2 h-8 w-8 dark:invert"
          />
          <span className="font-bold">Parsertime</span>
        </MobileLink>
        <ScrollArea className="my-4 h-[calc(100vh-8rem)] pb-10 pl-10">
          <div className="flex flex-col space-y-3">
            {mainNav.map(
              (item) =>
                item.href && (
                  <MobileLink
                    key={item.href}
                    href={item.href}
                    onOpenChange={setOpen}
                  >
                    {t(item.labelKey)}
                  </MobileLink>
                )
            )}
            <MobileLink href={availabilityHref} onOpenChange={setOpen}>
              {t("availability")}
            </MobileLink>
            {aiChatEnabled && (
              <MobileLink href={"/chat" as Route} onOpenChange={setOpen}>
                {t("chat")}
              </MobileLink>
            )}
            {dataToolsEnabled && (
              <>
                <MobileLink href="/data-labeling" onOpenChange={setOpen}>
                  {t("dataLabeling")}
                </MobileLink>
                <MobileLink
                  href={"/map-calibration" as Route}
                  onOpenChange={setOpen}
                >
                  {t("mapCalibration")}
                </MobileLink>
              </>
            )}
            {coachingCanvasEnabled && (
              <MobileLink
                href={"/coaching/canvas" as Route}
                onOpenChange={setOpen}
              >
                {t("coachingCanvas")}
              </MobileLink>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

type MobileLinkProps = {
  href: Route;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
};

function MobileLink({
  href,
  onOpenChange,
  className,
  children,
}: MobileLinkProps) {
  const router = useRouter();
  return (
    <Link
      href={href}
      onClick={() => {
        if (href.toString().startsWith("http")) return;
        router.push(href.toString() as Route);
        onOpenChange?.(false);
      }}
      className={cn(className)}
      target={href.toString().startsWith("http") ? "_blank" : undefined}
    >
      {children}
    </Link>
  );
}
