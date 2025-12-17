"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Scrim } from "@prisma/client";
import { CalendarIcon, Pencil2Icon, PersonIcon } from "@radix-ui/react-icons";
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
      <Card className="hover:border-primary/50 relative max-w-md overflow-hidden border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-lg sm:h-48 md:h-64 xl:h-48">
        <div className="from-primary/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

        <CardHeader className="relative space-y-2 pb-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="group-hover:text-primary line-clamp-2 text-lg leading-tight font-bold transition-colors duration-200">
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
          <p className="text-md text-foreground font-normal">
            <span className="text-muted-foreground">{t("team")}</span>
            {scrim.team}
          </p>
          <div className="absolute right-6 bottom-2 transition-opacity duration-200">
            <Image
              src={scrim.teamImage}
              alt={scrim.team}
              width={32}
              height={32}
              className="rounded-full object-cover"
            />
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
