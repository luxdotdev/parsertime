"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Scrim } from "@prisma/client";
import { Pencil2Icon } from "@radix-ui/react-icons";
import type { Route } from "next";
import { useTranslations } from "next-intl";

type Props = {
  scrim: Scrim & { team: string; creator: string; hasPerms: boolean };
  prefetch: boolean;
};

export function ScrimCard({ scrim, prefetch }: Props) {
  const t = useTranslations("dashboard.scrimCard");

  return (
    <Link
      href={`/${scrim.teamId}/scrim/${scrim.id}` as Route}
      prefetch={prefetch}
    >
      <Card className="max-w-md sm:h-48 md:h-64 xl:h-48">
        <CardHeader className="text-lg font-semibold">
          <div className="flex items-center justify-between">
            <span>{scrim.name}</span>
            {scrim.hasPerms && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/${scrim.teamId}/scrim/${scrim.id}/edit` as Route}
                      aria-label={t("editScrim")}
                    >
                      <Pencil2Icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{t("editScrim")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-muted-foreground text-sm font-normal">
            {scrim.date.toDateString()} | {scrim.creator}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-md text-foreground pt-10 font-normal">
            <span className="text-muted-foreground">{t("team")}</span>
            {scrim.team}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
