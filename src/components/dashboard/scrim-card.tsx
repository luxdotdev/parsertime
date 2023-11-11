"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import Link from "next/link";

type Scrim = {
  id: number;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  date: Date;
  teamId: number | null;
  creatorId: string;
};

export function ScrimCard({ scrim }: { scrim: Scrim }) {
  return (
    <Link href={`/${scrim.teamId ?? "uncategorized"}/scrim/${scrim.id}`}>
      <Card className="max-w-md h-48">
        <CardHeader>{scrim.name}</CardHeader>
        <CardDescription className="pl-6">
          {scrim.createdAt.toDateString()}
        </CardDescription>
        <CardContent>Scrim was created</CardContent>
      </Card>
    </Link>
  );
}
