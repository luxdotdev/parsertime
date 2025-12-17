"use client";

import { PlayerHoverCard } from "@/components/player/hover-card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import Link from "next/link";

type LeaderboardPlayer = {
  composite_sr: number;
  player_name: string;
  rank: number;
  percentile: string;
  role: string;
  hero: string;
  elims_per10?: number;
  fb_per10?: number;
  deaths_per10: number;
  damage_per10: number;
  healing_per10?: number;
  blocked_per10?: number;
  taken_per10?: number;
  solo_per10?: number;
  ults_per10?: number;
  maps: number;
  minutes_played: number;
};

type Props = {
  data: LeaderboardPlayer[];
  role?: "Tank" | "Damage" | "Support";
  selectedPlayer: LeaderboardPlayer | null;
  onPlayerSelect: (player: LeaderboardPlayer) => void;
};

export function LeaderboardTable({
  data,
  role,
  selectedPlayer,
  onPlayerSelect,
}: Props) {
  function handleRowKeyDown(
    e: React.KeyboardEvent<HTMLTableRowElement>,
    player: LeaderboardPlayer
  ) {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onPlayerSelect(player);
    }
  }

  return (
    <div className="overflow-hidden rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[100px]">Rank</TableHead>
            <TableHead>Player</TableHead>
            <TableHead className="text-right">SR</TableHead>
            <TableHead className="text-right">Maps</TableHead>
            <TableHead className="text-right">Time (min)</TableHead>
            <TableHead className="text-right">Elims/10</TableHead>
            <TableHead className="text-right">Deaths/10</TableHead>
            <TableHead className="text-right">Dmg/10</TableHead>
            {role === "Support" && (
              <TableHead className="text-right">Heal/10</TableHead>
            )}
            {role === "Tank" && (
              <TableHead className="text-right">Block/10</TableHead>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={role === "Damage" ? 8 : 9}
                className="h-24 text-center"
              >
                No players found.
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => {
              const isSelected =
                selectedPlayer?.player_name === row.player_name;
              return (
                <TableRow
                  key={row.player_name}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-sm ${
                    isSelected
                      ? "bg-muted/70 hover:bg-muted/70"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => onPlayerSelect(row)}
                  onKeyDown={(e) => handleRowKeyDown(e, row)}
                  tabIndex={0}
                  role="button"
                  aria-label={`View detailed stats for ${row.player_name}`}
                  aria-pressed={isSelected}
                >
                  <TableCell className="font-medium">{row.rank}</TableCell>
                  <TableCell>
                    <PlayerHoverCard player={row.player_name}>
                      <Link
                        href={`/profile/${row.player_name}`}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.player_name}
                      </Link>
                    </PlayerHoverCard>
                  </TableCell>
                  <TableCell className="text-right">
                    {row.composite_sr}
                  </TableCell>
                  <TableCell className="text-right">{row.maps}</TableCell>
                  <TableCell className="text-right">
                    {Math.round(row.minutes_played)}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.elims_per10?.toFixed(2) ?? "-"}
                  </TableCell>
                  <TableCell className="text-right">
                    {row.deaths_per10.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    {Math.round(row.damage_per10)}
                  </TableCell>
                  {role === "Support" && (
                    <TableCell className="text-right">
                      {Math.round(row.healing_per10 ?? 0)}
                    </TableCell>
                  )}
                  {role === "Tank" && (
                    <TableCell className="text-right">
                      {Math.round(row.blocked_per10 ?? 0)}
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
