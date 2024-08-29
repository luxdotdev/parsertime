"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Scrim } from "@prisma/client";
import { Pencil2Icon } from "@radix-ui/react-icons";
import Link from "next/link";

type Props = {
  scrim: Scrim & { team: string; creator: string; hasPerms: boolean };
};

export function ScrimCard({ scrim }: Props) {
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
                  <TooltipContent>Edit scrim</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
          <p className="text-sm font-normal text-muted-foreground">
            {scrim.date.toDateString()} | {scrim.creator}
          </p>
        </CardHeader>
        <CardContent>
          <p className="text-md pt-10 font-normal text-foreground">
            <span className="text-muted-foreground">Team: </span>
            {scrim.team}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
