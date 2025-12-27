"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HeroPoolAnalysis } from "@/data/team-hero-pool-dto";
import { toTimestampWithHours } from "@/lib/utils";
import Image from "next/image";

type HeroSpecialistsCardProps = {
  heroPool: HeroPoolAnalysis;
};

export function HeroSpecialistsCard({ heroPool }: HeroSpecialistsCardProps) {
  const specialists = heroPool.specialists.slice(0, 10);

  if (specialists.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Hero Specialists</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No specialists identified yet. Play more games with specific heroes
            to see specialist players (30%+ ownership).
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Hero Specialists</CardTitle>
        <p className="text-muted-foreground text-sm">
          Players who own 30%+ of team's playtime on specific heroes
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {specialists.map((specialist) => (
            <div
              key={`${specialist.playerName}-${specialist.heroName}`}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="relative h-12 w-12 overflow-hidden rounded">
                <Image
                  src={`/heroes/${specialist.heroName.toLowerCase().replace(/[.: ]/g, "")}.png`}
                  alt={specialist.heroName}
                  fill
                  className="object-cover"
                />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">{specialist.playerName}</span>
                  <span className="text-muted-foreground">•</span>
                  <span className="text-sm">{specialist.heroName}</span>
                </div>
                <div className="text-muted-foreground text-xs">
                  {toTimestampWithHours(specialist.playtime)} •{" "}
                  {specialist.gamesPlayed} games
                </div>
              </div>
              <Badge
                className="bg-purple-500 text-sm font-bold"
              >
                {specialist.ownershipPercentage.toFixed(0)}% ownership
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

