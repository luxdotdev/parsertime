"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toTitleCase } from "@/lib/utils";
import { Scrim } from "@prisma/client";
import { Pencil2Icon } from "@radix-ui/react-icons";
import { useTranslations } from "next-intl";
import Link from "next/link";

type Props = {
  scrim: Scrim & { team: string; creator: string; hasPerms: boolean };
};

export function ScrimCard({ scrim }: Props) {
  const t = useTranslations("dashboard.scrimCard");
  return (
    <Link href={`/${scrim.teamId}/scrim/${scrim.id}`}>
      <Card className="max-w-md sm:h-48 md:h-64 xl:h-48">
        <CardHeader className="text-lg font-semibold">
          <div className="flex items-center justify-between">
            <span>{scrim.name}</span>
            {scrim.hasPerms && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link
                      href={`/${scrim.teamId}/scrim/${scrim.id}/edit`}
                      aria-label="Edit scrim"
                    >
                      <Pencil2Icon className="h-4 w-4" />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>{t("editScrim")}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {t("scrimDate", {
            date: toTitleCase(
              t("clientDate.formatDate", { date: scrim.date }).replace(
                /[,.]/g,
                ""
              )
            ),
          })}
          <br />
          {t("team", {
            team: scrim.team === "Uncategorized" ? t("noTeam") : scrim.team,
          })}
          <br />
          {t("creator", {
            creator: scrim.creator,
          })}
        </CardContent>
      </Card>
    </Link>
  );
}
