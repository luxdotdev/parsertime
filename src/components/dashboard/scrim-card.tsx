"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil2Icon } from "@radix-ui/react-icons";
import Link from "next/link";

type Scrim = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
  teamId: number | null;
  creatorId: string;
  team: string;
  creator: string;
};

export function ScrimCard({ scrim }: { scrim: Scrim }) {
  return (
    <Link href={`/${scrim.teamId ?? "uncategorized"}/scrim/${scrim.id}`}>
      <Card className="max-w-md h-48">
        <CardHeader className="text-lg font-semibold">
          <div className="flex items-center justify-between">
            <span>{scrim.name}</span>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href={`/${scrim.teamId}/scrim/${scrim.id}/edit`}>
                    <Pencil2Icon className="w-4 h-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>Edit</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent>
          Scrim Date: {scrim.date.toDateString()}
          <br />
          Team: {scrim.team}
          <br />
          Creator: {scrim.creator}
        </CardContent>
      </Card>
    </Link>
  );
}
