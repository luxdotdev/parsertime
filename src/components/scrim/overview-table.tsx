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
import { ParserData } from "@/types/parser";

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
