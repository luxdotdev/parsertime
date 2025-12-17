/* eslint-disable @typescript-eslint/prefer-nullish-coalescing */
"use client";

import { DownloadAuditLogs } from "@/components/admin/download-audit-logs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { AuditLog } from "@prisma/client";
import { $Enums } from "@prisma/client";
import { useInfiniteQuery } from "@tanstack/react-query";
import { addWeeks, format } from "date-fns";
import {
  Bot,
  Bug,
  CalendarIcon,
  ChevronDown,
  Crown,
  Edit,
  Filter,
  ImageIcon,
  Loader2,
  Mail,
  Map,
  Minus,
  Plus,
  Shield,
  ShieldAlert,
  Target,
  Trash2,
  TrendingDown,
  TrendingUp,
  UserCheck,
  UserMinus,
  UserPlus,
  UserX,
  VenetianMask,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useDebounce } from "use-debounce";

const actionTypes = {
  // User Management Actions
  [$Enums.AuditLogAction.USER_BAN]: {
    label: "User Ban",
    className: "border-red-500 text-red-500",
    iconClassName: "text-red-500",
    icon: UserX,
  },
  [$Enums.AuditLogAction.USER_UNBAN]: {
    label: "User Unban",
    className: "border-emerald-500 text-emerald-500",
    iconClassName: "text-emerald-500",
    icon: UserCheck,
  },
  [$Enums.AuditLogAction.USER_AVATAR_UPDATED]: {
    label: "User Avatar Updated",
    className: "border-blue-500 text-blue-500",
    iconClassName: "text-blue-500",
    icon: ImageIcon,
  },
  [$Enums.AuditLogAction.USER_ACCOUNT_DELETED]: {
    label: "User Account Deleted",
    className: "border-red-600 text-red-600",
    iconClassName: "text-red-600",
    icon: UserMinus,
  },
  [$Enums.AuditLogAction.USER_NAME_UPDATED]: {
    label: "User Name Updated",
    className: "border-blue-400 text-blue-400",
    iconClassName: "text-blue-400",
    icon: Edit,
  },

  // Security & Admin Actions
  [$Enums.AuditLogAction.TRUST_SCORE_ADJUST]: {
    label: "Trust Score Adjust",
    className: "border-indigo-500 text-indigo-500",
    iconClassName: "text-indigo-500",
    icon: Shield,
  },
  [$Enums.AuditLogAction.IMPERSONATE_USER]: {
    label: "Impersonate User",
    className: "border-purple-500 text-purple-500",
    iconClassName: "text-purple-500",
    icon: VenetianMask,
  },
  [$Enums.AuditLogAction.SUSPICIOUS_ACTIVITY_DETECTED]: {
    label: "Suspicious Activity Detected",
    className: "border-orange-500 text-orange-500",
    iconClassName: "text-orange-500",
    icon: ShieldAlert,
  },

  // Team Management Actions
  [$Enums.AuditLogAction.TEAM_CREATED]: {
    label: "Team Created",
    className: "border-green-500 text-green-500",
    iconClassName: "text-green-500",
    icon: Plus,
  },
  [$Enums.AuditLogAction.TEAM_UPDATED]: {
    label: "Team Updated",
    className: "border-blue-500 text-blue-500",
    iconClassName: "text-blue-500",
    icon: Edit,
  },
  [$Enums.AuditLogAction.TEAM_DELETED]: {
    label: "Team Deleted",
    className: "border-red-500 text-red-500",
    iconClassName: "text-red-500",
    icon: Trash2,
  },
  [$Enums.AuditLogAction.TEAM_AVATAR_UPDATED]: {
    label: "Team Avatar Updated",
    className: "border-cyan-500 text-cyan-500",
    iconClassName: "text-cyan-500",
    icon: ImageIcon,
  },
  [$Enums.AuditLogAction.TEAM_INVITE_SENT]: {
    label: "Team Invite Sent",
    className: "border-violet-500 text-violet-500",
    iconClassName: "text-violet-500",
    icon: Mail,
  },
  [$Enums.AuditLogAction.TEAM_JOINED]: {
    label: "Team Joined",
    className: "border-green-400 text-green-400",
    iconClassName: "text-green-400",
    icon: UserPlus,
  },
  [$Enums.AuditLogAction.TEAM_LEFT]: {
    label: "Team Left",
    className: "border-yellow-500 text-yellow-500",
    iconClassName: "text-yellow-500",
    icon: UserMinus,
  },
  [$Enums.AuditLogAction.TEAM_MEMBER_PROMOTED]: {
    label: "Team Member Promoted",
    className: "border-emerald-600 text-emerald-600",
    iconClassName: "text-emerald-600",
    icon: TrendingUp,
  },
  [$Enums.AuditLogAction.TEAM_MEMBER_DEMOTED]: {
    label: "Team Member Demoted",
    className: "border-orange-400 text-orange-400",
    iconClassName: "text-orange-400",
    icon: TrendingDown,
  },
  [$Enums.AuditLogAction.TEAM_MEMBER_REMOVED]: {
    label: "Team Member Removed",
    className: "border-red-400 text-red-400",
    iconClassName: "text-red-400",
    icon: Minus,
  },
  [$Enums.AuditLogAction.TEAM_OWNERSHIP_TRANSFERRED]: {
    label: "Team Ownership Transferred",
    className: "border-amber-500 text-amber-500",
    iconClassName: "text-amber-500",
    icon: Crown,
  },

  // Scrim Management Actions
  [$Enums.AuditLogAction.SCRIM_CREATED]: {
    label: "Scrim Created",
    className: "border-teal-500 text-teal-500",
    iconClassName: "text-teal-500",
    icon: Target,
  },
  [$Enums.AuditLogAction.SCRIM_UPDATED]: {
    label: "Scrim Updated",
    className: "border-teal-400 text-teal-400",
    iconClassName: "text-teal-400",
    icon: Edit,
  },
  [$Enums.AuditLogAction.SCRIM_DELETED]: {
    label: "Scrim Deleted",
    className: "border-red-300 text-red-300",
    iconClassName: "text-red-300",
    icon: Trash2,
  },

  // Map Management Actions
  [$Enums.AuditLogAction.MAP_CREATED]: {
    label: "Map Created",
    className: "border-slate-500 text-slate-500",
    iconClassName: "text-slate-500",
    icon: Map,
  },
  [$Enums.AuditLogAction.MAP_UPDATED]: {
    label: "Map Updated",
    className: "border-slate-400 text-slate-400",
    iconClassName: "text-slate-400",
    icon: Edit,
  },
  [$Enums.AuditLogAction.MAP_DELETED]: {
    label: "Map Deleted",
    className: "border-slate-600 text-slate-600",
    iconClassName: "text-slate-600",
    icon: Trash2,
  },

  // System Actions
  [$Enums.AuditLogAction.BUG_REPORT_SUBMITTED]: {
    label: "Bug Report Submitted",
    className: "border-pink-500 text-pink-500",
    iconClassName: "text-pink-500",
    icon: Bug,
  },
};

function getActionBadge(action: string) {
  const actionInfo = actionTypes[action as keyof typeof actionTypes];

  if (actionInfo) {
    const Icon = actionInfo.icon;
    return (
      <Badge variant="outline" className={actionInfo.className}>
        <Icon className="mr-1 h-3 w-3" />
        {actionInfo.label}
      </Badge>
    );
  }

  return (
    <Badge variant="outline">
      <ShieldAlert className="mr-1 h-3 w-3" />
      {action.replace("_", " ")}
    </Badge>
  );
}

export function AuditLog({
  limit = 10,
  height = "max-h-[500px]",
}: {
  limit?: number;
  height?: string;
}) {
  const t = useTranslations("settingsPage.admin.audit-log");
  const loadMoreRef = useRef<HTMLTableRowElement>(null);

  const TODAY = new Date();

  const [dateRange, setDateRange] = useState<DateRange | undefined>(() => ({
    from: addWeeks(TODAY, -1),
    to: TODAY,
  }));

  const [selectedActions, setSelectedActions] = useState<string[]>([]);
  const [userEmailSearchInput, setUserEmailSearchInput] = useState("");
  const [targetSearchInput, setTargetSearchInput] = useState("");
  const [debouncedUserEmailSearch] = useDebounce(userEmailSearchInput, 300);
  const [debouncedTargetSearch] = useDebounce(targetSearchInput, 300);

  const uniqueActionTypes = Object.keys(
    actionTypes
  ) as (keyof typeof actionTypes)[];

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery<
    { items: AuditLog[]; nextCursor: number | null; hasMore: boolean },
    Error
  >({
    queryKey: [
      "auditLogs",
      dateRange,
      selectedActions,
      debouncedUserEmailSearch,
      debouncedTargetSearch,
    ] as const,
    initialPageParam: undefined,
    queryFn: async (context) => {
      const pageParam = context.pageParam as number | undefined;
      const params = new URLSearchParams();
      if (pageParam) params.set("cursor", pageParam.toString());
      params.set("limit", limit.toString());

      if (dateRange?.from)
        params.set("startDate", dateRange.from.toISOString());

      if (dateRange?.to) params.set("endDate", dateRange.to.toISOString());

      if (debouncedUserEmailSearch)
        params.set("userEmail", debouncedUserEmailSearch);
      if (debouncedTargetSearch) params.set("target", debouncedTargetSearch);

      selectedActions.forEach((action) => params.append("action", action));

      const res = await fetch(`/api/admin/audit-logs?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch audit logs");

      return res.json() as Promise<{
        items: AuditLog[];
        nextCursor: number | null;
        hasMore: boolean;
      }>;
    },
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.length === 0) return;
        const first = entries[0];
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    const currentRef = loadMoreRef.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
    };
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const logs: AuditLog[] = data ? data.pages.flatMap((page) => page.items) : [];

  function formatDateRange() {
    if (!dateRange) return "Select date range";

    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "PPP");
      }
      return `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`;
    }

    if (dateRange.from) {
      return `From ${format(dateRange.from, "PP")}`;
    }

    if (dateRange.to) {
      return `Until ${format(dateRange.to, "PP")}`;
    }

    return "Select date range";
  }

  function toggleActionType(actionType: string) {
    setSelectedActions((prev) =>
      prev.includes(actionType)
        ? prev.filter((a) => a !== actionType)
        : [...prev, actionType]
    );
  }

  function clearFilters() {
    setSelectedActions([]);
    setDateRange(undefined);
    setUserEmailSearchInput("");
    setTargetSearchInput("");
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{t("title")}</h3>
      <div className="flex flex-col justify-between gap-2 sm:flex-row">
        <div className="flex flex-wrap gap-2">
          <Input
            type="text"
            placeholder={t("search-user-email")}
            value={userEmailSearchInput}
            onChange={(e) => setUserEmailSearchInput(e.target.value)}
            className="w-[200px]"
          />
          <Input
            type="text"
            placeholder={t("search-target")}
            value={targetSearchInput}
            onChange={(e) => setTargetSearchInput(e.target.value)}
            className="w-[200px]"
          />

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4" />
                {formatDateRange()}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange?.from}
                selected={dateRange}
                onSelect={setDateRange}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t("action-types")}
                {selectedActions.length > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 rounded-full px-1 text-xs"
                  >
                    {selectedActions.length}
                  </Badge>
                )}
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{t("filter-label")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {uniqueActionTypes.map((actionType) => {
                const actionInfo = actionTypes[actionType];
                return (
                  <DropdownMenuCheckboxItem
                    key={actionType}
                    checked={selectedActions.includes(actionType)}
                    onCheckedChange={() => toggleActionType(actionType)}
                  >
                    <span className="flex items-center">
                      {actionInfo && (
                        <actionInfo.icon
                          className={`mr-2 h-4 w-4 ${actionInfo.iconClassName}`}
                        />
                      )}
                      {actionInfo
                        ? actionInfo.label
                        : actionType.replace("_", " ")}
                    </span>
                  </DropdownMenuCheckboxItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {(selectedActions.length > 0 ||
            dateRange ||
            debouncedUserEmailSearch ||
            debouncedTargetSearch) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={clearFilters}
              className="h-9 w-9"
              aria-label="Clear filters"
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Active filters display */}
      {(selectedActions.length > 0 ||
        dateRange ||
        debouncedUserEmailSearch ||
        debouncedTargetSearch) && (
        <div className="flex flex-wrap gap-2">
          {debouncedUserEmailSearch && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {t("user-email", { userEmail: debouncedUserEmailSearch })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setUserEmailSearchInput("")}
              />
            </Badge>
          )}
          {debouncedTargetSearch && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {t("target", { target: debouncedTargetSearch })}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setTargetSearchInput("")}
              />
            </Badge>
          )}
          {selectedActions.map((action) => {
            const actionInfo = actionTypes[action as keyof typeof actionTypes];
            return (
              <Badge
                key={action}
                variant="secondary"
                className="flex items-center gap-1"
              >
                {actionInfo ? actionInfo.label : action.replace("_", " ")}
                <X
                  className="h-3 w-3 cursor-pointer"
                  onClick={() =>
                    setSelectedActions((prev) =>
                      prev.filter((a) => a !== action)
                    )
                  }
                />
              </Badge>
            );
          })}
          {dateRange && (
            <Badge variant="secondary" className="flex items-center gap-1">
              {formatDateRange()}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => setDateRange(undefined)}
              />
            </Badge>
          )}
          {Boolean(
            selectedActions.length > 0 ||
            dateRange ||
            debouncedUserEmailSearch ||
            debouncedTargetSearch
          ) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 px-2 text-xs"
            >
              {t("clear-filters")}
            </Button>
          )}
        </div>
      )}

      <div className="rounded-md border">
        <ScrollArea className={cn("overflow-auto", height)}>
          <Table className="w-full">
            <TableHeader>
              <TableRow>
                <TableHead>{t("table.user-email")}</TableHead>
                <TableHead>{t("table.action")}</TableHead>
                <TableHead>{t("table.target")}</TableHead>
                <TableHead>{t("table.details")}</TableHead>
                <TableHead>{t("table.date-time")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <Loader2 className="mx-auto animate-spin" />
                  </TableCell>
                </TableRow>
              ) : isError ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t("table.error-loading-logs")}
                  </TableCell>
                </TableRow>
              ) : logs.length > 0 ? (
                <>
                  {logs.map((log) => (
                    <AuditLogHoverCard key={log.id.toString()} log={log} />
                  ))}
                  {hasNextPage && (
                    <TableRow ref={loadMoreRef}>
                      <TableCell colSpan={5} className="h-20 text-center">
                        {isFetchingNextPage && (
                          <Loader2 className="mx-auto h-6 w-6 animate-spin" />
                        )}
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    {t("table.no-logs-found")}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </ScrollArea>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground text-sm">
          {t("showing-logs", { count: logs.length })}
        </p>
        <DownloadAuditLogs logs={logs} />
      </div>
    </div>
  );
}

function AuditLogHoverCard({ log }: { log: AuditLog }) {
  const t = useTranslations("settingsPage.admin.audit-log");

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <TableRow className="cursor-pointer">
          <TableCell className="flex items-center gap-1 font-medium">
            {log.userEmail === "System" && <Bot className="h-4 w-4" />}
            {log.userEmail}
          </TableCell>
          <TableCell>{getActionBadge(log.action)}</TableCell>
          <TableCell>{log.target}</TableCell>
          <TableCell className="max-w-xs truncate" title={log.details}>
            {log.details}
          </TableCell>
          <TableCell>
            {t("table.date-time-format", {
              date: format(new Date(log.createdAt), "PP"),
              time: format(new Date(log.createdAt), "p"),
            })}
          </TableCell>
        </TableRow>
      </HoverCardTrigger>
      <HoverCardContent className="w-96 p-0">
        <div className="space-y-2">
          {/* Header section with admin name */}
          <div className="bg-muted/50 border-b p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-muted-foreground text-sm font-semibold">
                {t("hover.user-email")}
              </h3>
              <span className="flex items-center gap-1 text-sm font-medium">
                {log.userEmail === "System" && <Bot className="h-4 w-4" />}
                {log.userEmail}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <h3 className="text-muted-foreground text-sm font-semibold">
                {t("hover.action")}
              </h3>
              <span>{getActionBadge(log.action)}</span>
            </div>
          </div>

          {/* Content section */}
          <div className="px-4 py-2">
            <div className="space-y-4">
              <div>
                <h4 className="text-muted-foreground mb-1 text-sm font-semibold">
                  {t("hover.target")}
                </h4>
                <p className="bg-muted rounded-md px-2 py-1 text-sm font-medium">
                  {log.target}
                </p>
              </div>

              <div>
                <h4 className="text-muted-foreground mb-1 text-sm font-semibold">
                  {t("hover.details")}
                </h4>
                <p className="bg-muted rounded-md px-2 py-1 text-sm">
                  {log.details}
                </p>
              </div>

              <div>
                <h4 className="text-muted-foreground mb-1 text-sm font-semibold">
                  {t("hover.timestamp")}
                </h4>
                <p className="bg-muted rounded-md px-2 py-1 text-sm font-medium">
                  {format(new Date(log.createdAt), "PPPp")}
                </p>
              </div>
            </div>
          </div>

          {/* Footer with ID */}
          <div className="bg-muted/50 border-t px-4 py-2">
            <div className="flex items-center justify-between">
              <p className="text-muted-foreground text-xs">
                {t("hover.id", { id: log.id.toString() })}
              </p>
              {log.userEmail === "System" && (
                <p className="text-muted-foreground text-xs">
                  {t("hover.auto-generated")}
                </p>
              )}
            </div>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
