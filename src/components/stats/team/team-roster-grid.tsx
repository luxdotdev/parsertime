import { PlayerHoverCard } from "@/components/player/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import prisma from "@/lib/prisma";
import type { Route } from "next";

type TeamRosterGridProps = {
  roster: string[];
};

async function getPlayerData(playerName: string) {
  const user = await prisma.user.findFirst({
    where: {
      OR: [
        { name: { equals: playerName, mode: "insensitive" } },
        { battletag: { equals: playerName, mode: "insensitive" } },
      ],
    },
    select: {
      name: true,
      image: true,
      battletag: true,
    },
  });

  return user;
}

export async function TeamRosterGrid({ roster }: TeamRosterGridProps) {
  if (roster.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Roster</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">
            No roster data available. Players will appear here once they&apos;ve
            played in matches.
          </p>
        </CardContent>
      </Card>
    );
  }

  const playersData = await Promise.all(
    roster.map(async (playerName) => {
      const userData = await getPlayerData(playerName);
      return {
        name: playerName,
        image: userData?.image ?? null,
        displayName: userData?.name ?? userData?.battletag ?? playerName,
      };
    })
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Team Roster</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {playersData.map((player) => (
            <Link
              key={player.name}
              href={`/stats/${encodeURIComponent(player.name)}` as Route}
              className="group hover:bg-accent flex flex-col items-center gap-2 rounded-lg p-3 transition-colors"
            >
              <PlayerHoverCard player={player.name}>
                <div className="flex flex-col items-center gap-2">
                  <Avatar className="h-16 w-16 transition-transform group-hover:scale-110">
                    <AvatarImage
                      src={player.image ?? undefined}
                      alt={player.displayName}
                    />
                    <AvatarFallback className="text-lg font-bold">
                      {player.displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="w-full truncate text-center text-sm font-medium">
                    {player.displayName}
                  </span>
                </div>
              </PlayerHoverCard>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
