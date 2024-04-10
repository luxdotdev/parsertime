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
import { PlayerData, aggregatePlayerData } from "@/lib/player-table-data";
import { PlayerStatRows } from "@/types/prisma";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, toTimestamp } from "@/lib/utils";
import { GeistMono } from "geist/font/mono";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/20/solid";

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
      <button
        onClick={() =>
          (window.location.href = `${
            window.location.href
          }/player/${encodeURIComponent(row.getValue("playerName"))}`)
        }
      >
        {row.getValue("playerName")}
      </button>
    ),
    enableSorting: true,
    sortingFn: "basic",
    filterFn: "includesString",
  },
  {
    accessorKey: "role",
    header: "Role",
    cell: ({ row }) => <div className="capitalize">{row.getValue("role")}</div>,
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "playerTeam",
    header: "Player Team",
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("playerTeam")}</div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "timePlayed",
    header: "Time Played",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {toTimestamp(row.getValue<number>("timePlayed"))}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "eliminations",
    header: "Eliminations",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue("eliminations")}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "kills",
    header: "Final Blows",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue("kills")}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "assists",
    header: "Assists",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue("assists")}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "deaths",
    header: "Deaths",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue("deaths")}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "kd",
    header: "K/D",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue<number>("kd").toFixed(2)}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "kad",
    header: "KA/D",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue<number>("kad").toFixed(2)}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "heroDmgDealt",
    header: "Hero Damage Dealt",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue<number>("heroDmgDealt").toFixed(2)}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "dmgReceived",
    header: "Damage Received",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue<number>("dmgReceived").toFixed(2)}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "healingReceived",
    header: "Healing Received",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue<number>("healingReceived").toFixed(2)}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "healingDealt",
    header: "Healing Dealt",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue<number>("healingDealt").toFixed(2)}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "dmgToHealsRatio",
    header: "Damage Dealt:Healing Received",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue<number>("dmgToHealsRatio").toFixed(2)}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "ultsCharged",
    header: "Ultimates Charged",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue("ultsCharged")}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "ultsUsed",
    header: "Ultimates Used",
    cell: ({ row }) => (
      <div className={cn(GeistMono.className, "text-right capitalize")}>
        {row.getValue("ultsUsed")}
      </div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
];

const tooltips = {
  playerName:
    "The player's name. Click on their name to view their statistics.",
  role: "The role the player played.",
  playerTeam: "The team the player played for.",
  timePlayed: "The time the player played.",
  eliminations: "The number of eliminations the player had.",
  kills: "The number of final blows the player had.",
  assists: "The number of assists the player had.",
  deaths: "The number of deaths the player had.",
  kd: "The player's kill/death ratio.",
  kad: "The player's kill/assist/death ratio.",
  heroDmgDealt: "The amount of hero damage the player dealt.",
  dmgReceived: "The amount of damage the player received.",
  healingReceived: "The amount of healing the player received.",
  healingDealt: "The amount of healing the player dealt.",
  dmgToHealsRatio: "The player's damage dealt to healing received ratio.",
  ultsCharged: "The number of ultimates the player charged.",
  ultsUsed: "The number of ultimates the player used.",
};

export function OverviewTable({
  playerStats,
}: {
  playerStats: PlayerStatRows;
}) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});

  const tableData = React.useMemo(
    () => aggregatePlayerData(playerStats),
    [playerStats]
  );

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
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          {header.isPlaceholder ? null : header.column.getCanSort() ? (
                            <Button
                              variant="ghost"
                              onClick={header.column.getToggleSortingHandler()}
                              className="h-max p-1 w-min w-full"
                            >
                              {flexRender(
                                header.column.columnDef.header,
                                header.getContext()
                              )}
                              {{
                                asc: <ChevronUpIcon className="min-w-5 w-5" />,
                                desc: (
                                  <ChevronDownIcon className="min-w-5 w-5" />
                                ),
                              }[header.column.getIsSorted() as string] ?? null}
                            </Button>
                          ) : (
                            flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )
                          )}
                        </TooltipTrigger>
                        <TooltipContent>
                          {tooltips[
                            header.column.id as keyof typeof tooltips
                          ] || ""}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </TableHead>
                ))}
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
