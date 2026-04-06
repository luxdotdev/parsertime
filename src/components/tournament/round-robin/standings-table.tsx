import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

type Standing = {
  teamId: number;
  teamName: string;
  matchesWon: number;
  matchesLost: number;
  mapsWon: number;
  mapsLost: number;
  mapDifferential: number;
};

export function StandingsTable({
  standings,
  advancingCount,
}: {
  standings: Standing[];
  advancingCount: number;
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-12">#</TableHead>
          <TableHead>Team</TableHead>
          <TableHead className="w-14 text-center">W</TableHead>
          <TableHead className="w-14 text-center">L</TableHead>
          <TableHead className="w-16 text-center">Map W</TableHead>
          <TableHead className="w-16 text-center">Map L</TableHead>
          <TableHead className="w-20 text-center">Map Diff</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {standings.map((team, index) => {
          const rank = index + 1;
          const advances = rank <= advancingCount;

          return (
            <TableRow
              key={team.teamId}
              className={cn(!advances && "opacity-50")}
            >
              <TableCell className="tabular-nums">{rank}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{team.teamName}</span>
                  {advances && (
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                      Advances
                    </Badge>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {team.matchesWon}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {team.matchesLost}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {team.mapsWon}
              </TableCell>
              <TableCell className="text-center tabular-nums">
                {team.mapsLost}
              </TableCell>
              <TableCell
                className={cn(
                  "text-center tabular-nums font-medium",
                  team.mapDifferential > 0 &&
                    "text-emerald-600 dark:text-emerald-400",
                  team.mapDifferential < 0 && "text-rose-600 dark:text-rose-400"
                )}
              >
                {team.mapDifferential > 0
                  ? `+${team.mapDifferential}`
                  : team.mapDifferential}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
