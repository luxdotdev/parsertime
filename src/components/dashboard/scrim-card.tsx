"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
        <CardHeader className="text-lg font-semibold">{scrim.name}</CardHeader>
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
