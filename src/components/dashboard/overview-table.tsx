"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HeroName, heroRoleMapping } from "../../../types/heroes";
import { ParserData, PlayerStatTableRow } from "../../../types/parser";

export type PlayerData = {
  id: number;
  playerName: string;
  role: string;
  playerTeam: string;
  timePlayed: number;
  kills: number;
  assists: number;
  deaths: number;
  kd: number;
  kad: number;
  heroDmgDealt: number;
  dmgReceived: number;
  healingReceived: number;
  healingDealt: number;
  dmgToHealsRatio: number;
  ultsCharged: number;
  ultsUsed: number;
};

export const columns: ColumnDef<PlayerData>[] = [
  {
    accessorKey: "id",
    header: "",
    cell: ({ row }) => <div className="text-right">{row.index + 1}</div>,
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "playerName",
    header: "Player Name",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("playerName")}</div>
    ),
    enableSorting: true,
    sortingFn: "basic",
    filterFn: "includesString",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <div className="capitalize">{row.getValue("role")}</div>,
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "playerTeam",
    header: "Player Team",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("playerTeam")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "timePlayed",
    header: "Time Played",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("timePlayed")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "kills",
    header: "Kills",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("kills")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "assists",
    header: "Assists",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("assists")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "deaths",
    header: "Deaths",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("deaths")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "kd",
    header: "K/D",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("kd")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "kad",
    header: "KA/D",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("kad")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "heroDmgDealt",
    header: "Hero Damage Dealt",
    cell: ({ row }) => (
      <div className="capitalize text-right">
        {row.getValue("heroDmgDealt")}
      </div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "dmgReceived",
    header: "Damage Received",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("dmgReceived")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "healingReceived",
    header: "Healing Received",
    cell: ({ row }) => (
      <div className="capitalize text-right">
        {row.getValue("healingReceived")}
      </div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "healingDealt",
    header: "Healing Dealt",
    cell: ({ row }) => (
      <div className="capitalize text-right">
        {row.getValue("healingDealt")}
      </div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "dmgToHealsRatio",
    header: "Damage Dealt:Healing Received",
    cell: ({ row }) => (
      <div className="capitalize text-right">
        {row.getValue("dmgToHealsRatio")}
      </div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "ultsCharged",
    header: "Ultimates Charged",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("ultsCharged")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "ultsUsed",
    header: "Ultimates Used",
    cell: ({ row }) => (
      <div className="capitalize text-right">{row.getValue("ultsUsed")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
];

function round(value: number) {
  // round to 2 decimal places
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function determineRole(heroName: HeroName) {
  return heroRoleMapping[heroName] || "Flex";
}

function aggregatePlayerData(rows: PlayerStatTableRow[]): PlayerData[] {
  const playerMap = new Map<string, PlayerData>();
  const playerMaxMatchTime = new Map<string, number>();
  const teamElimsMap = new Map<string, number>();

  rows.forEach((row, index) => {
    const [
      _eventType,
      matchTime,
      _roundNumber,
      playerTeam,
      playerName,
      playerHero,
      eliminations,
      finalBlows,
      deaths,
      _allDamageDealt,
      _barrierDamageDealt,
      heroDamageDealt,
      healingDealt,
      healingReceived,
      _selfHealing,
      damageTaken,
      _damageBlocked,
      _defensiveAssists,
      offensiveAssists,
      ultimatesEarned,
      ultimatesUsed,
      hero_time_played,
    ] = row;

    let player = playerMap.get(playerName);

    // Update team total eliminations
    const currentTeamElims = teamElimsMap.get(playerTeam) || 0;
    teamElimsMap.set(playerTeam, currentTeamElims + eliminations);

    if (!player) {
      player = {
        id: index, // You need to define how you want to handle the ID
        playerName,
        role: determineRole(playerHero),
        playerTeam,
        kills: 0,
        assists: 0,
        deaths: 0,
        kd: 0,
        kad: 0,
        heroDmgDealt: 0,
        dmgReceived: 0,
        healingReceived: 0,
        healingDealt: 0,
        dmgToHealsRatio: 0,
        ultsCharged: 0,
        ultsUsed: 0,
        timePlayed: 0,
      };
    }

    const currentMaxTime = playerMaxMatchTime.get(playerName) || 0;
    if (matchTime > currentMaxTime) {
      playerMaxMatchTime.set(playerName, matchTime);
    }

    // Update the stats
    player.kills += finalBlows;
    player.assists += offensiveAssists;
    player.deaths += deaths;
    player.heroDmgDealt += heroDamageDealt;
    player.dmgReceived += damageTaken;
    player.healingReceived += healingReceived;
    player.healingDealt += healingDealt;
    player.ultsCharged += ultimatesEarned;
    player.ultsUsed += ultimatesUsed;
    player.timePlayed += hero_time_played;

    // Recalculate ratios - you will need to define these calculations
    player.kd = player.deaths !== 0 ? player.kills / player.deaths : 0;
    player.kad =
      player.deaths !== 0 ? (player.kills + player.assists) / player.deaths : 0;
    player.dmgToHealsRatio = player.heroDmgDealt / player.healingReceived;

    // round all fields to 2 decimal places
    player.kd = round(player.kd);
    player.kad = round(player.kad);
    player.heroDmgDealt = round(player.heroDmgDealt);
    player.dmgReceived = round(player.dmgReceived);
    player.healingReceived = round(player.healingReceived);
    player.healingDealt = round(player.healingDealt);
    player.dmgToHealsRatio = round(player.dmgToHealsRatio);

    playerMap.set(playerName, player);
  });

  // Set time played for each player
  playerMaxMatchTime.forEach((maxTime, playerName) => {
    const player = playerMap.get(playerName) || {
      // ... Initialize other fields for the player
      timePlayed: 0,
      // ... Other fields
    };

    // Set time played in minutes
    player.timePlayed = round(maxTime / 60);
    playerMap.set(playerName, player as PlayerData);
  });

  return Array.from(playerMap.values());
}

export function OverviewTable({ data }: { data: ParserData }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const tableData = aggregatePlayerData(data.player_stat);

  const table = useReactTable({
    data: tableData,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    enableSortingRemoval: true,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  });

  return (
    <div className="w-full">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
