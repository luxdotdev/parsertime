import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { HeroBan, Map, MapData, MatchStart } from "@prisma/client";
import type { Route } from "next";
import Image from "next/image";
import Link from "next/link";

type TournamentMapWithDetails = {
  id: number;
  gameNumber: number;
  winnerOverride: string | null;
  map:
    | (Map & {
        mapData: (MapData & {
          match_start: MatchStart[];
          HeroBan: HeroBan[];
        })[];
      })
    | null;
};

type MatchMapsPanelProps = {
  tournamentId: number;
  matchId: number;
  maps: TournamentMapWithDetails[];
  team1Name: string;
  team2Name: string;
  scrimId: number | null;
};

export function MatchMapsPanel({
  tournamentId,
  matchId,
  maps,
  team1Name,
  team2Name,
  scrimId,
}: MatchMapsPanelProps) {
  return (
    <div className="space-y-4">
      <h4 className="text-muted-foreground text-center text-sm font-medium tracking-wide uppercase">
        Maps
      </h4>

      {maps.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground text-sm">
              No maps uploaded yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {maps.map((tournamentMap) => {
            const mapData = tournamentMap.map?.mapData?.[0];
            const matchStart = mapData?.match_start?.[0];
            const mapName = tournamentMap.map?.name ?? "Unknown Map";
            const mapType = matchStart?.map_type ?? null;
            const heroBans = mapData?.HeroBan ?? [];

            const winner = tournamentMap.winnerOverride ?? null;
            const team1Won = winner === team1Name;
            const team2Won = winner === team2Name;

            const mapDetailHref =
              tournamentMap.map && scrimId
                ? `/_/scrim/${scrimId}/map/${tournamentMap.map.id}?from=tournament&tournamentId=${tournamentId}&matchId=${matchId}`
                : null;

            const content = (
              <Card
                className={cn(
                  "transition-colors",
                  mapDetailHref && "hover:border-primary/50 cursor-pointer"
                )}
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <Badge variant="outline" className="shrink-0">
                    Map {tournamentMap.gameNumber}
                  </Badge>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium">
                        {mapName}
                      </span>
                      {mapType && (
                        <Badge variant="secondary" className="text-xs">
                          {mapType}
                        </Badge>
                      )}
                    </div>

                    {heroBans.length > 0 && (
                      <div className="mt-1 flex gap-1">
                        {heroBans
                          .sort((a, b) => a.banPosition - b.banPosition)
                          .map((ban) => (
                            <div
                              key={ban.id}
                              className={cn(
                                "size-6 overflow-hidden rounded border-2",
                                ban.team === team1Name
                                  ? "border-blue-500"
                                  : "border-red-500"
                              )}
                            >
                              <Image
                                src={`/heroes/${ban.hero}.png`}
                                alt={ban.hero}
                                width={24}
                                height={24}
                                className="size-full object-cover"
                              />
                            </div>
                          ))}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        team1Won && "text-emerald-600 dark:text-emerald-400",
                        team2Won && "text-muted-foreground"
                      )}
                    >
                      {team1Won ? "W" : team2Won ? "L" : "-"}
                    </span>
                    <span className="text-muted-foreground">|</span>
                    <span
                      className={cn(
                        "font-bold tabular-nums",
                        team2Won && "text-emerald-600 dark:text-emerald-400",
                        team1Won && "text-muted-foreground"
                      )}
                    >
                      {team2Won ? "W" : team1Won ? "L" : "-"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            );

            if (mapDetailHref) {
              return (
                <Link key={tournamentMap.id} href={mapDetailHref as Route}>
                  {content}
                </Link>
              );
            }

            return <div key={tournamentMap.id}>{content}</div>;
          })}
        </div>
      )}
    </div>
  );
}
