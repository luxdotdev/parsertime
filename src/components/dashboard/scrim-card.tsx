"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Scrim } from "@prisma/client";
import { CalendarIcon, Pencil2Icon, PersonIcon } from "@radix-ui/react-icons";
import { BadgeCheck } from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";

type Props = {
  scrim: Scrim & {
    team: string;
    teamImage: string;
    creator: string;
    hasPerms: boolean;
  };
  prefetch: boolean;
};

export function ScrimCard({ scrim, prefetch }: Props) {
  const t = useTranslations("dashboard.scrimCard");

  return (
    <Link
      href={`/${scrim.teamId}/scrim/${scrim.id}` as Route}
      prefetch={prefetch}
      transitionTypes={["expand-map"]}
      className="group block"
    >
      <Card
        data-size="sm"
        className="[@media(hover:hover)_and_(pointer:fine)]:hover:ring-foreground/25 [@media(hover:hover)_and_(pointer:fine)]:hover:bg-card/60 relative max-w-md gap-3 overflow-hidden motion-safe:transition-[box-shadow,background-color] motion-safe:duration-150"
      >
        <CardHeader className="relative space-y-2 pb-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-base leading-tight font-semibold tracking-tight">
              {scrim.name}
            </h3>
            {scrim.hasPerms && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/${scrim.teamId}/scrim/${scrim.id}/edit` as Route}
                    aria-label={t("editScrim")}
                    className="text-muted-foreground hover:bg-muted hover:text-foreground -mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md transition-colors"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Pencil2Icon className="h-3.5 w-3.5" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>{t("editScrim")}</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <CalendarIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="font-mono tabular-nums" suppressHydrationWarning>
                {scrim.date.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "2-digit",
                })}
              </span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2 text-xs">
              <PersonIcon className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span className="truncate">{scrim.creator}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex min-w-0 items-center gap-2 text-sm">
            <span className="text-muted-foreground shrink-0 font-mono text-[0.6875rem] tracking-[0.06em] uppercase">
              {t("team")}
            </span>
            <Image
              src={scrim.teamImage}
              alt=""
              width={20}
              height={20}
              className="ring-foreground/10 size-5 shrink-0 rounded-full object-cover ring-1"
            />
            <span className="text-foreground truncate">{scrim.team}</span>
            {scrim.opponentTeamAbbr && (
              <>
                <span
                  className="text-muted-foreground/40 shrink-0"
                  aria-hidden="true"
                >
                  |
                </span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={
                        `/scouting/team/${encodeURIComponent(scrim.opponentTeamAbbr)}` as Route
                      }
                      className="no-underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Badge
                        variant="secondary"
                        className="gap-1.5 text-xs font-medium"
                      >
                        <BadgeCheck
                          className="text-primary h-3.5 w-3.5"
                          aria-hidden="true"
                        />
                        {scrim.opponentTeamAbbr}
                      </Badge>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{t("viewScoutingReport")}</TooltipContent>
                </Tooltip>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
