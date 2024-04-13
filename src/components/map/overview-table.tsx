"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  Header,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
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
import { DataTable } from "../ui/data-table";

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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.playerName} header={header}>
        Player Name
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.role} header={header}>
        Role
      </OverviewTableHeader>
    ),
    cell: ({ row }) => <div className="capitalize">{row.getValue("role")}</div>,
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "playerTeam",
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.playerTeam} header={header}>
        Player Team
      </OverviewTableHeader>
    ),
    cell: ({ row }) => (
      <div className="capitalize">{row.getValue("playerTeam")}</div>
    ),
    enableSorting: true,
    enableColumnFilter: false,
  },
  {
    accessorKey: "timePlayed",
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.timePlayed} header={header}>
        Time Played
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.eliminations} header={header}>
        Eliminations
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.kills} header={header}>
        Final Blows
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.assists} header={header}>
        Assists
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.deaths} header={header}>
        Deaths
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.kd} header={header}>
        K/D
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.kad} header={header}>
        KA/D
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.heroDmgDealt} header={header}>
        Hero Damage Dealt
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.dmgReceived} header={header}>
        Damage Received
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.healingReceived} header={header}>
        Healing Received
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.healingDealt} header={header}>
        Healing Dealt
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.dmgToHealsRatio} header={header}>
        Damage Dealt:Healing Received
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.ultsCharged} header={header}>
        Ultimates Charged
      </OverviewTableHeader>
    ),
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
    header: ({ header }) => (
      <OverviewTableHeader tooltip={tooltips.ultsUsed} header={header}>
        Ultimates Used
      </OverviewTableHeader>
    ),
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
        <DataTable table={table} />
      </div>
    </div>
  );
}

const OverviewTableHeader = ({
  tooltip,
  header,
  children,
}: {
  tooltip?: string;
  header: Header<PlayerData, unknown>;
  children: React.ReactNode;
}) => {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger>
          {header.isPlaceholder ? null : header.column.getCanSort() ? (
            <Button
              variant="ghost"
              onClick={header.column.getToggleSortingHandler()}
              className="h-max w-full p-1"
            >
              {!header.column.getIsSorted() && <span className="w-2" />}
              {children}
              {{
                asc: <ChevronUpIcon className="w-4 min-w-4" />,
                desc: <ChevronDownIcon className="w-4 min-w-4" />,
              }[header.column.getIsSorted() as string] ?? null}
              {!header.column.getIsSorted() && <span className="w-2" />}
            </Button>
          ) : (
            children
          )}
        </TooltipTrigger>
        <TooltipContent>{tooltip ?? ""}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
