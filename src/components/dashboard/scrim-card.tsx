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
      className="group block"
    >
      <Card className="[@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50 relative max-w-md overflow-hidden border-2 active:scale-[0.97] motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200 sm:h-48 md:h-64 xl:h-48 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-lg">
        <div className="from-primary/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 motion-safe:transition-opacity motion-safe:duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100" />

        <CardHeader className="relative space-y-2 pb-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="[@media(hover:hover)_and_(pointer:fine)]:group-hover:text-primary line-clamp-2 text-lg leading-tight font-bold transition-colors duration-200">
              {scrim.name}
            </h3>
            {scrim.hasPerms && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={`/${scrim.teamId}/scrim/${scrim.id}/edit` as Route}
                    aria-label={t("editScrim")}
                    className="hover:bg-primary/10 -mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors duration-200"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Pencil2Icon className="h-4 w-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>{t("editScrim")}</TooltipContent>
              </Tooltip>
            )}
          </div>

          <div className="flex flex-col gap-1 text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium">
                {scrim.date.toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
            <div className="text-muted-foreground flex items-center gap-2">
              <PersonIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{scrim.creator}</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="relative">
          <div className="flex items-center gap-2">
            <p className="text-md text-foreground font-normal">
              <span className="text-muted-foreground">{t("team")}</span>
              {scrim.team}
            </p>
            {scrim.opponentTeamAbbr && (
              <>
                <span className="text-muted-foreground/50" aria-hidden="true">
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
                          className="h-3.5 w-3.5 text-amber-500"
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
          <div className="absolute right-6 bottom-2 transition-opacity duration-200">
            <Image
              src={scrim.teamImage}
              alt={scrim.team}
              width={32}
              height={32}
              className="ring-foreground/10 rounded-full object-cover ring-1"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
