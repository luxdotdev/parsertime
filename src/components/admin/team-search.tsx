"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardFooter, CardHeader } from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Link } from "@/components/ui/link";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  CalendarIcon,
  ChartBarIcon,
  ChevronDown,
  ChevronLeftIcon,
  ChevronRightIcon,
  Filter,
  Loader2,
  Lock,
  Search,
  Users,
} from "lucide-react";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { useEffect, useRef, useState } from "react";
import type { DateRange } from "react-day-picker";
import { useDebounce } from "use-debounce";

type TeamItem = {
  id: number;
  name: string;
  image: string | null;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
  readonly: boolean;
  _count: {
    users: number;
    managers: number;
    scrims: number;
  };
};

type TeamResponse = {
  items: TeamItem[];
  totalCount: number;
  hasMore: boolean;
};

const PAGE_SIZE = 12;

export function TeamSearch() {
  const t = useTranslations("teamPage");
  const pathname = usePathname();

  const [page, setPage] = useQueryState(
    "adminPage",
    parseAsInteger.withDefault(1)
  );
  const [q, setQ] = useQueryState("adminQ", parseAsString.withDefault(""));
  const [sort, setSort] = useQueryState(
    "adminSort",
    parseAsString.withDefault("")
  );

  const [searchInput, setSearchInput] = useState(q);
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const userTypedRef = useRef(false);

  const [readonlyFilter, setReadonlyFilter] = useState("all");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    if (!userTypedRef.current) return;
    userTypedRef.current = false;
    void setQ(debouncedSearch || null);
    void setPage(null);
  }, [debouncedSearch, setQ, setPage]);

  const prevQ = useRef(q);
  useEffect(() => {
    if (q !== prevQ.current) {
      prevQ.current = q;
      setSearchInput(q);
    }
  }, [q]);

  useEffect(() => {
    void setPage(null);
  }, [readonlyFilter, dateRange, setPage]);

  const currentPage = Math.max(1, page);

  function handleSortChange(value: string) {
    void setSort(value || null);
    void setPage(null);
  }

  const { data, isLoading, isError } = useQuery<TeamResponse>({
    queryKey: [
      "admin-teams",
      currentPage,
      debouncedSearch,
      sort,
      readonlyFilter,
      dateRange,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("page", currentPage.toString());
      params.set("limit", PAGE_SIZE.toString());

      if (debouncedSearch) params.set("search", debouncedSearch);
      if (sort) params.set("sort", sort);
      if (readonlyFilter !== "all") params.set("readonly", readonlyFilter);
      if (dateRange?.from)
        params.set("createdAfter", dateRange.from.toISOString());
      if (dateRange?.to)
        params.set("createdBefore", dateRange.to.toISOString());

      const res = await fetch(`/api/admin/team-search?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to fetch teams");
      return res.json() as Promise<TeamResponse>;
    },
  });

  const teams = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  const pagination = handlePagination({
    currentPage,
    totalCount,
    pageSize: PAGE_SIZE,
    siblingCount: 1,
    boundaryCount: 1,
  });

  function pageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set("adminPage", String(targetPage));
    if (q) params.set("adminQ", q);
    if (sort) params.set("adminSort", sort);
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function handlePageClick(targetPage: number, e: React.MouseEvent) {
    e.preventDefault();
    void setPage(targetPage === 1 ? null : targetPage);
  }

  function formatDateRange() {
    if (!dateRange) return t("search.selectDateRange");
    if (dateRange.from && dateRange.to) {
      if (dateRange.from.toDateString() === dateRange.to.toDateString()) {
        return format(dateRange.from, "PPP");
      }
      return `${format(dateRange.from, "PP")} - ${format(dateRange.to, "PP")}`;
    }
    if (dateRange.from) return `From ${format(dateRange.from, "PP")}`;
    if (dateRange.to) return `Until ${format(dateRange.to, "PP")}`;
    return t("search.selectDateRange");
  }

  function clearFilters() {
    setSearchInput("");
    void setQ(null);
    void setSort(null);
    setReadonlyFilter("all");
    setDateRange(undefined);
    void setPage(null);
  }

  if (isError) {
    return (
      <Card className="bg-background">
        <div className="flex h-96 items-center justify-center">
          <p className="text-muted-foreground">{t("search.errorLoading")}</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-background">
      <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex gap-2">
          <Select value={sort || undefined} onValueChange={handleSortChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("search.sort.title")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date-desc">
                {t("search.sort.newestFirst")}
              </SelectItem>
              <SelectItem value="date-asc">
                {t("search.sort.oldestFirst")}
              </SelectItem>
            </SelectContent>
          </Select>

          <InputGroup className="md:w-[200px] lg:w-[300px]">
            <InputGroupInput
              type="search"
              placeholder={t("search.placeholder")}
              aria-label={t("search.placeholder")}
              name="team-search"
              autoComplete="off"
              value={searchInput}
              onChange={(e) => {
                userTypedRef.current = true;
                setSearchInput(e.target.value);
              }}
            />
            <InputGroupAddon>
              <Search aria-hidden="true" />
            </InputGroupAddon>
          </InputGroup>
        </span>

        <Button
          variant="outline"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <Filter className="h-4 w-4" />
          {t("search.filters")}
        </Button>
      </div>

      {showFilters && (
        <div className="grid gap-4 border-t px-4 py-4 md:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("search.readonlyStatus")}
            </label>
            <Select value={readonlyFilter} onValueChange={setReadonlyFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("search.allTeams")}</SelectItem>
                <SelectItem value="false">{t("search.activeTeams")}</SelectItem>
                <SelectItem value="true">
                  {t("search.readonlyTeams")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {t("search.createdDateRange")}
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formatDateRange()}
                  <ChevronDown className="ml-auto h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
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
          </div>

          <div className="flex items-end">
            <Button
              variant="secondary"
              className="w-full"
              onClick={clearFilters}
            >
              {t("search.resetFilters")}
            </Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading ? (
          <div className="col-span-full flex h-48 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : teams.length > 0 ? (
          teams.map((team) => (
            <div key={team.id} className="p-2">
              <Card className="relative min-h-[144px] md:w-60 xl:w-80">
                <Link href={`/team/${team.id}` as Route}>
                  <Image
                    src={
                      team.image ?? `https://avatar.vercel.sh/${team.name}.png`
                    }
                    alt={
                      team.name
                        ? t("altText.custom", { team: team.name })
                        : t("altText.default")
                    }
                    width={100}
                    height={100}
                    className="float-right rounded-full p-4"
                  />
                  <CardHeader>
                    <h3 className="z-10 text-3xl font-semibold tracking-tight">
                      {team.name}
                    </h3>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="gap-1">
                        <Users className="h-3 w-3" />
                        {team._count.users}
                      </Badge>
                      {team.readonly && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          {t("search.readonly")}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                </Link>
                <Link
                  href={`/stats/team/${team.id}` as Route}
                  className="hover:underline"
                >
                  <CardFooter className="flex items-center gap-2">
                    <ChartBarIcon className="h-4 w-4" />
                    {t("viewStats")} &rarr;
                  </CardFooter>
                </Link>
              </Card>
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground text-lg font-medium">
              {t("search.noTeamsFound")}
            </p>
            <p className="text-muted-foreground text-sm">
              {t("search.tryAdjustingFilters")}
            </p>
          </div>
        )}

        <div className="col-span-full">
          {!isLoading && data && pagination.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                {pagination.hasPrevious && (
                  <>
                    <PaginationPrevious
                      className="hidden md:flex"
                      href={pageUrl(currentPage - 1)}
                      onClick={(e) => handlePageClick(currentPage - 1, e)}
                    />
                    <PaginationItem className="md:hidden">
                      <PaginationLink
                        href={pageUrl(currentPage - 1)}
                        onClick={(e) => handlePageClick(currentPage - 1, e)}
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                {pagination.pages.map((pageNum, index) => {
                  if (pageNum === "...") {
                    // oxlint-disable-next-line react/no-array-index-key
                    return <PaginationEllipsis key={`ellipsis-${index}`} />;
                  }
                  return (
                    <PaginationItem key={pageNum}>
                      <PaginationLink
                        href={pageUrl(pageNum)}
                        onClick={(e) => handlePageClick(pageNum, e)}
                        isActive={currentPage === pageNum}
                        className="tabular-nums"
                      >
                        {pageNum}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {pagination.hasNext && (
                  <>
                    <PaginationNext
                      className="hidden md:flex"
                      href={pageUrl(currentPage + 1)}
                      onClick={(e) => handlePageClick(currentPage + 1, e)}
                    />
                    <PaginationItem className="md:hidden">
                      <PaginationLink
                        href={pageUrl(currentPage + 1)}
                        onClick={(e) => handlePageClick(currentPage + 1, e)}
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>

      <div className="border-t px-4 py-2">
        <p className="text-muted-foreground text-sm">
          {t("search.showingTeams", { count: totalCount })}
        </p>
      </div>
    </Card>
  );
}

function handlePagination({
  currentPage,
  totalCount,
  siblingCount = 1,
  pageSize,
  boundaryCount = 1,
}: {
  currentPage: number;
  totalCount: number;
  siblingCount?: number;
  pageSize: number;
  boundaryCount?: number;
}) {
  const totalPages = Math.ceil(totalCount / pageSize);

  if (totalPages <= 5) {
    return {
      currentPage,
      totalPages,
      hasPrevious: currentPage > 1,
      hasNext: currentPage < totalPages,
      pages: Array.from({ length: totalPages }, (_, idx) => idx + 1),
    };
  }

  let pages: (number | "...")[] = [];

  const startPages = Array.from(
    { length: Math.min(boundaryCount, totalPages) },
    (_, idx) => idx + 1
  );
  const endPages = Array.from(
    { length: Math.min(boundaryCount, totalPages) },
    (_, idx) => totalPages - idx
  ).reverse();

  const rangeStart = Math.max(boundaryCount + 1, currentPage - siblingCount);
  const rangeEnd = Math.min(
    totalPages - boundaryCount,
    currentPage + siblingCount
  );

  pages = [...startPages];

  if (rangeStart > boundaryCount + 1) {
    pages.push("...");
  }

  pages = pages.concat(
    Array.from(
      { length: rangeEnd - rangeStart + 1 },
      (_, idx) => rangeStart + idx
    )
  );

  if (rangeEnd < totalPages - boundaryCount && totalPages > boundaryCount) {
    pages.push("...");
  }

  pages = pages.concat(endPages);

  return {
    currentPage,
    totalPages,
    hasPrevious: currentPage > 1,
    hasNext: currentPage < totalPages,
    pages,
  };
}
