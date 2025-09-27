"use client";

import {
  type ColumnDef,
  type ColumnFiltersState,
  type Header,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Link } from "@/components/ui/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { type PlayerData, aggregatePlayerData } from "@/lib/player-table-data";
import { cn, toTimestamp } from "@/lib/utils";
import {
  ChevronDownIcon,
  ChevronUpDownIcon,
  ChevronUpIcon,
} from "@heroicons/react/20/solid";
import type { PlayerStat } from "@prisma/client";
import { GeistMono } from "geist/font/mono";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";

export function OverviewTable({ playerStats }: { playerStats: PlayerStat[] }) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState({});
  const pathname = usePathname();

  const tableData = React.useMemo(
    () => aggregatePlayerData(playerStats),
    [playerStats]
  );

  const t = useTranslations("mapPage.overviewTable");

  const columns: ColumnDef<PlayerData>[] = [
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
          {t("header.playerName")}
        </OverviewTableHeader>
      ),
      cell: ({ row }) => (
        <Link
          href={
            `${pathname}/player/${encodeURIComponent(row.getValue("playerName"))}` as Route
          }
          prefetch={true}
        >
          {row.getValue("playerName")}
        </Link>
      ),
      enableSorting: true,
      sortingFn: "basic",
      filterFn: "includesString",
    },
    {
      accessorKey: "role",
      header: ({ header }) => (
        <OverviewTableHeader tooltip={tooltips.role} header={header}>
          {t("header.role")}
        </OverviewTableHeader>
      ),
      cell: ({ row }) => (
        <div className="capitalize">
          {t(`roles.${row.getValue<string>("role")}`)}
        </div>
      ),
      enableSorting: true,
      enableColumnFilter: false,
    },
    {
      accessorKey: "playerTeam",
      header: ({ header }) => (
        <OverviewTableHeader tooltip={tooltips.playerTeam} header={header}>
          {t("header.playerTeam")}
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
          {t("header.timePlayed")}
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
          {t("header.eliminations")}
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
          {t("header.kills")}
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
          {t("header.assists")}
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
          {t("header.deaths")}
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
          {t("header.kd")}
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
          {t("header.kad")}
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
          {t("header.heroDmgDealt")}
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
          {t("header.dmgReceived")}
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
          {t("header.healingReceived")}
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
          {t("header.healingDealt")}
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
          {t("header.dmgToHealsRatio")}
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
          {t("header.ultsCharged")}
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
          {t("header.ultsUsed")}
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
    playerName: t("tooltips.playerName"),
    role: t("tooltips.role"),
    playerTeam: t("tooltips.playerTeam"),
    timePlayed: t("tooltips.timePlayed"),
    eliminations: t("tooltips.eliminations"),
    kills: t("tooltips.kills"),
    assists: t("tooltips.assists"),
    deaths: t("tooltips.deaths"),
    kd: t("tooltips.kd"),
    kad: t("tooltips.kad"),
    heroDmgDealt: t("tooltips.heroDmgDealt"),
    dmgReceived: t("tooltips.dmgReceived"),
    healingReceived: t("tooltips.healingReceived"),
    healingDealt: t("tooltips.healingDealt"),
    dmgToHealsRatio: t("tooltips.dmgToHealsRatio"),
    ultsCharged: t("tooltips.ultsCharged"),
    ultsUsed: t("tooltips.ultsUsed"),
  };

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
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
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
                  colSpan={table.getAllColumns().length}
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

function OverviewTableHeader({
  tooltip,
  header,
  children,
}: {
  tooltip?: string;
  header: Header<PlayerData, unknown>;
  children: React.ReactNode;
}) {
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
              {children}
              {!header.column.getIsSorted() && (
                <ChevronUpDownIcon className="w-4 min-w-4" />
              )}
              {{
                asc: <ChevronUpIcon className="w-4 min-w-4" />,
                desc: <ChevronDownIcon className="w-4 min-w-4" />,
              }[header.column.getIsSorted() as string] ?? null}
            </Button>
          ) : (
            children
          )}
        </TooltipTrigger>
        <TooltipContent>{tooltip ?? ""}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
