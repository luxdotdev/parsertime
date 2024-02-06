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

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { round, toMins } from "@/lib/utils";
import { PlayerStat } from "@prisma/client";

type ColumnData = {
  stat: string;
  value: number;
  per10: number | string;
};

export const columns: ColumnDef<ColumnData>[] = [
  {
    accessorKey: "stat",
    header: "Stat",
    cell: ({ row }) => <div className="capitalize">{row.getValue("stat")}</div>,
    enableSorting: false,
    enableColumnFilter: false,
  },
  {
    accessorKey: "value",
    header: "Total",
    cell: ({ row }) => <div className="">{row.getValue("value")}</div>,
    enableSorting: true,
    sortingFn: "basic",
    filterFn: "includesString",
  },
  {
    accessorKey: "per10",
    header: "Avg/10 min",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("per10")}</div>
    ),
    enableSorting: false,
    enableColumnFilter: false,
  },
];

export function StatsTable({ data: playerStat }: { data: PlayerStat }) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const tableData = [
    {
      stat: "Hero Time Played",
      value: `${toMins(playerStat.hero_time_played)} mins`,
      per10: "--:--",
    },
    {
      stat: "Eliminations",
      value: playerStat.eliminations,
      per10: round(
        (playerStat.eliminations / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Final Blows",
      value: playerStat.final_blows,
      per10: round(
        (playerStat.final_blows / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Deaths",
      value: playerStat.deaths,
      per10: round(
        (playerStat.deaths / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "All Damage Dealt",
      value: playerStat.all_damage_dealt,
      per10: round(
        (playerStat.all_damage_dealt / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Barrier Damage Dealt",
      value: playerStat.barrier_damage_dealt,
      per10: round(
        (playerStat.barrier_damage_dealt /
          toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: "Hero Damage Dealt",
      value: playerStat.hero_damage_dealt,
      per10: round(
        (playerStat.hero_damage_dealt / toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: "Healing Dealt",
      value: playerStat.healing_dealt,
      per10: round(
        (playerStat.healing_dealt / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Healing Received",
      value: playerStat.healing_received,
      per10: round(
        (playerStat.healing_received / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Self Healing",
      value: playerStat.self_healing,
      per10: round(
        (playerStat.self_healing / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Damage Taken",
      value: playerStat.damage_taken,
      per10: round(
        (playerStat.damage_taken / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Damage Blocked",
      value: playerStat.damage_blocked,
      per10: round(
        (playerStat.damage_blocked / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Defensive Assists",
      value: playerStat.defensive_assists,
      per10: round(
        (playerStat.defensive_assists / toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: "Offensive Assists",
      value: playerStat.offensive_assists,
      per10: round(
        (playerStat.offensive_assists / toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: "Ultimates Earned",
      value: playerStat.ultimates_earned,
      per10: round(
        (playerStat.ultimates_earned / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Ultimates Used",
      value: playerStat.ultimates_used,
      per10: round(
        (playerStat.ultimates_used / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Multikill Best",
      value: playerStat.multikill_best,
      per10: "--:--",
    },
    {
      stat: "Multikills",
      value: playerStat.multikills,
      per10: round(
        (playerStat.multikills / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Solo Kills",
      value: playerStat.solo_kills,
      per10: round(
        (playerStat.solo_kills / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Objective Kills",
      value: playerStat.objective_kills,
      per10: round(
        (playerStat.objective_kills / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Environmental Kills",
      value: playerStat.environmental_kills,
      per10: round(
        (playerStat.environmental_kills / toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: "Environmental Deaths",
      value: playerStat.environmental_deaths,
      per10: round(
        (playerStat.environmental_deaths /
          toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: "Critical Hits",
      value: playerStat.critical_hits,
      per10: round(
        (playerStat.critical_hits / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: "Critical Hit Accuracy",
      value: `${playerStat.critical_hit_accuracy * 100}%`,
      per10: "--:--",
    },
    {
      stat: "Scoped Accuracy",
      value: playerStat.scoped_accuracy,
      per10: "--:--",
    },
    {
      stat: "Scoped Critical Hit Accuracy",
      value: `${playerStat.scoped_critical_hit_accuracy * 100}%`,
      per10: "--:--",
    },
    {
      stat: "Scoped Critical Hit Kills",
      value: playerStat.scoped_critical_hit_kills,
      per10: "--:--",
    },
    {
      stat: "Weapon Accuracy",
      value: `${playerStat.weapon_accuracy * 100}%`,
      per10: "--:--",
    },
  ];

  const table = useReactTable({
    data: tableData,
    // @ts-expect-error idk how to fix this
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
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
    <div className="space-y-4">
      <div className="rounded-xl border max-h-[29.5rem] overflow-y-scroll">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
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
    </div>
  );
}
