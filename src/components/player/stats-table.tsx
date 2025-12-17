"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
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
import { cn, round, toMins } from "@/lib/utils";
import type { PlayerStat } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
import { useTranslations } from "next-intl";

type ColumnData = {
  stat: string;
  value: number;
  per10: number | string;
};

export function StatsTable({ data: playerStat }: { data: PlayerStat }) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const t = useTranslations("mapPage.player.statTable");

  const columns: ColumnDef<ColumnData>[] = [
    {
      accessorKey: "stat",
      header: t("stat"),
      cell: ({ row }) => (
        <div className="capitalize">{row.getValue("stat")}</div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
    {
      accessorKey: "value",
      header: t("total"),
      cell: ({ row }) => (
        <div className={GeistMono.className}>{row.getValue("value")}</div>
      ),
      enableSorting: true,
      sortingFn: "basic",
      filterFn: "includesString",
    },
    {
      accessorKey: "per10",
      header: t("avg10Min"),
      cell: ({ row }) => (
        <div className={cn(GeistMono.className, "capitalize")}>
          {row.getValue("per10")}
        </div>
      ),
      enableSorting: false,
      enableColumnFilter: false,
    },
  ];

  const tableData = [
    {
      stat: t("timePlayed"),
      value: t("mins", { mins: toMins(playerStat.hero_time_played) }),
      per10: "--:--",
    },
    {
      stat: t("eliminations"),
      value: playerStat.eliminations,
      per10: round(
        (playerStat.eliminations / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("finalBlows"),
      value: playerStat.final_blows,
      per10: round(
        (playerStat.final_blows / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("deaths"),
      value: playerStat.deaths,
      per10: round(
        (playerStat.deaths / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("allDmgDealt"),
      value: round(playerStat.all_damage_dealt).toLocaleString(),
      per10: round(
        (playerStat.all_damage_dealt / toMins(playerStat.hero_time_played)) * 10
      ).toLocaleString(),
    },
    {
      stat: t("barrierDmgDealt"),
      value: round(playerStat.barrier_damage_dealt).toLocaleString(),
      per10: round(
        (playerStat.barrier_damage_dealt /
          toMins(playerStat.hero_time_played)) *
          10
      ).toLocaleString(),
    },
    {
      stat: t("heroDmgDealt"),
      value: round(playerStat.hero_damage_dealt).toLocaleString(),
      per10: round(
        (playerStat.hero_damage_dealt / toMins(playerStat.hero_time_played)) *
          10
      ).toLocaleString(),
    },
    {
      stat: t("healingDealt"),
      value: round(playerStat.healing_dealt).toLocaleString(),
      per10: round(
        (playerStat.healing_dealt / toMins(playerStat.hero_time_played)) * 10
      ).toLocaleString(),
    },
    {
      stat: t("healingReceived"),
      value: round(playerStat.healing_received).toLocaleString(),
      per10: round(
        (playerStat.healing_received / toMins(playerStat.hero_time_played)) * 10
      ).toLocaleString(),
    },
    {
      stat: t("selfHealing"),
      value: round(playerStat.self_healing).toLocaleString(),
      per10: round(
        (playerStat.self_healing / toMins(playerStat.hero_time_played)) * 10
      ).toLocaleString(),
    },
    {
      stat: t("dmgTaken"),
      value: round(playerStat.damage_taken).toLocaleString(),
      per10: round(
        (playerStat.damage_taken / toMins(playerStat.hero_time_played)) * 10
      ).toLocaleString(),
    },
    {
      stat: t("dmgBlocked"),
      value: round(playerStat.damage_blocked).toLocaleString(),
      per10: round(
        (playerStat.damage_blocked / toMins(playerStat.hero_time_played)) * 10
      ).toLocaleString(),
    },
    {
      stat: t("defenseAssist"),
      value: playerStat.defensive_assists,
      per10: round(
        (playerStat.defensive_assists / toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: t("offenseAssist"),
      value: playerStat.offensive_assists,
      per10: round(
        (playerStat.offensive_assists / toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: t("ultsEarned"),
      value: playerStat.ultimates_earned,
      per10: round(
        (playerStat.ultimates_earned / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("ultsUsed"),
      value: playerStat.ultimates_used,
      per10: round(
        (playerStat.ultimates_used / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("multikillBest"),
      value: playerStat.multikill_best,
      per10: "--:--",
    },
    {
      stat: t("multikills"),
      value: playerStat.multikills,
      per10: round(
        (playerStat.multikills / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("soloKills"),
      value: playerStat.solo_kills,
      per10: round(
        (playerStat.solo_kills / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("objKills"),
      value: playerStat.objective_kills,
      per10: round(
        (playerStat.objective_kills / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("envKills"),
      value: playerStat.environmental_kills,
      per10: round(
        (playerStat.environmental_kills / toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: t("envDeaths"),
      value: playerStat.environmental_deaths,
      per10: round(
        (playerStat.environmental_deaths /
          toMins(playerStat.hero_time_played)) *
          10
      ),
    },
    {
      stat: t("critHits"),
      value: playerStat.critical_hits,
      per10: round(
        (playerStat.critical_hits / toMins(playerStat.hero_time_played)) * 10
      ),
    },
    {
      stat: t("critHitAcc"),
      value: `${round(playerStat.critical_hit_accuracy * 100)}%`,
      per10: "--:--",
    },
    {
      stat: t("scopedAcc"),
      value: `${round(playerStat.scoped_accuracy * 100)}%`,
      per10: "--:--",
    },
    {
      stat: t("scopedCritHitAcc"),
      value: `${round(playerStat.scoped_critical_hit_accuracy * 100)}%`,
      per10: "--:--",
    },
    {
      stat: t("scopedCritHitKills"),
      value: playerStat.scoped_critical_hit_kills,
      per10: "--:--",
    },
    {
      stat: t("weaponAcc"),
      value: `${round(playerStat.weapon_accuracy * 100)}%`,
      per10: "--:--",
    },
  ];

  // eslint-disable-next-line react-hooks/incompatible-library
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
      <div className="max-h-[29.5rem] overflow-y-scroll rounded-xl border">
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
                  {t("noResult")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
