"use client";

import { CreateScrimButton } from "@/components/dashboard/create-scrim";
import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { ScrimCardSkeleton } from "@/components/dashboard/scrim-card-skeleton";
import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
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
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Scrim } from "@prisma/client";
import { useQuery } from "@tanstack/react-query";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeftIcon, ChevronRightIcon, Info, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { parseAsInteger, parseAsString, useQueryState } from "nuqs";
import { use, useEffect, useRef, useState } from "react";
import { useDebounce } from "use-debounce";

type ScrimWithDetails = Scrim & {
  team: string;
  teamImage: string;
  creator: string;
  hasPerms: boolean;
};

type ScrimResponse = {
  scrims: ScrimWithDetails[];
  nextCursor?: string;
  hasMore: boolean;
  totalCount: number;
};

export function ScrimPagination({
  isAdmin = false,
  seenOnboarding,
}: {
  isAdmin?: boolean;
  seenOnboarding?: boolean;
}) {
  const prefersReducedMotion = useReducedMotion();
  const pathname = usePathname();
  const t = useTranslations("dashboard");
  const { teamId } = use(TeamSwitcherContext);

  // URL state via nuqs
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [sort, setSort] = useQueryState("sort", parseAsString.withDefault(""));
  const [q, setQ] = useQueryState("q", parseAsString.withDefault(""));

  // Local search input with debounce → syncs to URL
  const [searchInput, setSearchInput] = useState(q);
  const [debouncedSearch] = useDebounce(searchInput, 300);
  const userTypedRef = useRef(false);

  // Sync debounced search to URL (only when user typed, not on mount/back-forward)
  useEffect(() => {
    if (!userTypedRef.current) return;
    userTypedRef.current = false;
    void setQ(debouncedSearch || null);
    void setPage(null); // Reset to page 1
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  // Sync URL → local input (for back/forward navigation)
  const prevQ = useRef(q);
  useEffect(() => {
    if (q !== prevQ.current) {
      prevQ.current = q;
      setSearchInput(q);
    }
  }, [q]);

  // Reset to page 1 when team changes (skip initial mount)
  const effectiveTeamId = isAdmin ? null : teamId;
  const prevTeamId = useRef(effectiveTeamId);
  useEffect(() => {
    if (prevTeamId.current !== effectiveTeamId) {
      prevTeamId.current = effectiveTeamId;
      void setPage(null);
    }
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveTeamId]);

  const currentPage = Math.max(1, page);
  const pageSize = 16;

  // Build URL for a given page number (preserves all current params)
  function pageUrl(targetPage: number) {
    const params = new URLSearchParams();
    if (targetPage > 1) params.set("page", String(targetPage));
    if (sort) params.set("sort", sort);
    if (q) params.set("q", q);
    if (teamId) params.set("team", String(teamId));
    const qs = params.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  }

  function handleFilterChange(value: string) {
    void setSort(value || null);
    void setPage(null); // Reset to page 1
  }

  function handlePageClick(targetPage: number, e: React.MouseEvent) {
    e.preventDefault();
    void setPage(targetPage === 1 ? null : targetPage);
  }

  // Fetch scrims using React Query
  const { data, isLoading, isError, error } = useQuery<ScrimResponse, Error>({
    queryKey: isAdmin
      ? ["admin-scrims", currentPage, debouncedSearch, sort]
      : ["scrims", currentPage, debouncedSearch, sort, teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", pageSize.toString());

      if (currentPage > 1) {
        params.set("page", currentPage.toString());
      }

      if (isAdmin) {
        params.set("adminMode", "true");
      }

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (sort) {
        params.set("filter", sort);
      }

      if (teamId && !isAdmin) {
        params.set("teamId", teamId.toString());
      }

      const response = await fetch(
        `/api/scrim/get-scrims?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch scrims");
      }

      const result = (await response.json()) as ScrimResponse;

      // Convert date strings back to Date objects
      result.scrims = result.scrims.map((scrim) => ({
        ...scrim,
        date: new Date(scrim.date),
        createdAt: new Date(scrim.createdAt),
        updatedAt: new Date(scrim.updatedAt),
      }));

      return result;
    },
  });

  // Check if user has any scrims at all (without filters)
  const { data: totalScrimsData } = useQuery<ScrimResponse, Error>({
    queryKey: isAdmin ? ["admin-scrims-total"] : ["scrims-total", teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "1");

      if (isAdmin) {
        params.set("adminMode", "true");
      }

      if (teamId && !isAdmin) {
        params.set("teamId", teamId.toString());
      }

      const response = await fetch(
        `/api/scrim/get-scrims?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch scrims");
      }

      return response.json() as Promise<ScrimResponse>;
    },
  });

  const totalCount = data?.totalCount ?? 0;

  const pagination = handlePagination({
    currentPage,
    totalCount,
    siblingCount: 1,
    pageSize,
    boundaryCount: 1,
  });

  // Generate skeleton cards array for consistent loading experience
  const skeletonCards = Array.from({ length: pageSize }, (_, index) => (
    <ScrimCardSkeleton key={`skeleton-${index}`} />
  ));

  // Handle error state
  if (isError) {
    return (
      <div
        className="border-border bg-card flex h-72 items-center justify-center rounded-xl border"
        aria-live="polite"
      >
        <p className="text-muted-foreground text-sm">
          Error loading scrims: {error?.message}
        </p>
      </div>
    );
  }

  // Show empty scrim list only if user has no scrims at all
  if (!isLoading && totalScrimsData?.totalCount === 0) {
    return <EmptyScrimList isOnboarding={!seenOnboarding} />;
  }

  const firstFiveScrims = data?.scrims.slice(0, 5) ?? [];

  const pageStart = (currentPage - 1) * pageSize + 1;
  const pageEnd = Math.min(currentPage * pageSize, totalCount);
  const sortLabel =
    sort === "date-desc"
      ? t("filter.newToOld").toLowerCase()
      : sort === "date-asc"
        ? t("filter.oldToNew").toLowerCase()
        : null;

  return (
    <div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="inline-flex gap-2">
          <Select value={sort || undefined} onValueChange={handleFilterChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder={t("filter.title")} />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectLabel>{t("filter.select")}</SelectLabel>
                <SelectItem value="date-desc">
                  {t("filter.newToOld")}
                </SelectItem>
                <SelectItem value="date-asc">{t("filter.oldToNew")}</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>

          <InputGroup className="md:w-[100px] lg:w-[260px]">
            <InputGroupInput
              type="search"
              placeholder={t("filter.search")}
              aria-label={t("filter.search")}
              name="scrim-search"
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
            <InputGroupAddon align="inline-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label={t("filter.searchInfoLabel")}
                    className="mr-1 inline-flex size-4 items-center justify-center"
                  >
                    <Info className="size-4" aria-hidden="true" />
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {t.rich("filter.searchDescription", {
                    code: (chunks) => (
                      <code className="bg-muted-foreground/10 rounded-md px-1 py-0.5 font-mono">
                        {chunks}
                      </code>
                    ),
                    strong: (chunks) => (
                      <span className="font-semibold">{chunks}</span>
                    ),
                  })}
                </TooltipContent>
              </Tooltip>
            </InputGroupAddon>
          </InputGroup>
        </span>

        <CreateScrimButton />
      </div>

      <div
        className="text-muted-foreground mt-4 flex h-5 items-center justify-between font-mono text-[0.6875rem] tracking-[0.04em] tabular-nums uppercase"
        aria-live="polite"
      >
        <span>
          {isLoading ? (
            <span className="opacity-0">·</span>
          ) : data && totalCount > 0 ? (
            <>
              {pagination.totalPages > 1 ? (
                <>
                  {pageStart}
                  <span className="text-muted-foreground/50">–</span>
                  {pageEnd}
                  <span className="text-muted-foreground/60 mx-1">of</span>
                  {totalCount}
                  <span className="text-foreground/80 ml-1.5 normal-case">
                    {totalCount === 1 ? "scrim" : "scrims"}
                  </span>
                </>
              ) : (
                <>
                  {totalCount}
                  <span className="text-foreground/80 ml-1.5 normal-case">
                    {totalCount === 1 ? "scrim" : "scrims"}
                  </span>
                </>
              )}
              {sortLabel && (
                <>
                  <span className="text-muted-foreground/40 mx-2">·</span>
                  <span className="normal-case">{sortLabel}</span>
                </>
              )}
              {debouncedSearch && (
                <>
                  <span className="text-muted-foreground/40 mx-2">·</span>
                  <span className="normal-case">
                    matching &ldquo;{debouncedSearch}&rdquo;
                  </span>
                </>
              )}
            </>
          ) : null}
        </span>
        {!isLoading && data && pagination.totalPages > 1 && (
          <span>
            page {currentPage}
            <span className="text-muted-foreground/60 mx-1 normal-case">
              of
            </span>
            {pagination.totalPages}
          </span>
        )}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading ? (
          <>
            {/* Show skeleton cards during loading */}
            {skeletonCards}
          </>
        ) : data && data.scrims.length > 0 ? (
          <>
            {data.scrims.map((scrim, index) => (
              <motion.div
                key={scrim.id}
                initial={prefersReducedMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.2,
                  delay: Math.min(index * 0.05, 0.4),
                  ease: [0, 0, 0.2, 1],
                }}
              >
                <ScrimCard
                  scrim={scrim}
                  prefetch={firstFiveScrims.includes(scrim)}
                />
              </motion.div>
            ))}
          </>
        ) : (
          <>
            {/* Show "no results" message when search/filter returns empty but user has scrims */}
            <motion.div
              className="col-span-full flex flex-col items-center justify-center py-12"
              initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: [0, 0, 0.2, 1] }}
            >
              <p className="text-muted-foreground text-lg font-medium">
                {t("filter.noScrimsFound")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("filter.tryAdjustingFilters")}
              </p>
            </motion.div>
          </>
        )}

      </div>

      {!isLoading && data && pagination.totalPages > 1 && (
        <div className="mt-8">
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
                  return (
                    <PaginationEllipsis
                      // oxlint-disable-next-line react/no-array-index-key
                      key={`ellipsis-${index}`}
                    />
                  );
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
        </div>
      )}
    </div>
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

  // If total pages are 5 or fewer, return the full range without ellipses.
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

  // Define fixed boundaries if there are enough pages beyond the boundaryCount
  const startPages = Array.from(
    { length: Math.min(boundaryCount, totalPages) },
    (_, idx) => idx + 1
  );
  const endPages = Array.from(
    { length: Math.min(boundaryCount, totalPages) },
    (_, idx) => totalPages - idx
  ).reverse();

  // Define dynamic range around the current page
  const rangeStart = Math.max(boundaryCount + 1, currentPage - siblingCount);
  const rangeEnd = Math.min(
    totalPages - boundaryCount,
    currentPage + siblingCount
  );

  pages = [...startPages];

  // Include ellipsis if there's a gap between the last start page and the first page of the dynamic range
  if (rangeStart > boundaryCount + 1) {
    pages.push("...");
  }

  pages = pages.concat(
    Array.from(
      { length: rangeEnd - rangeStart + 1 },
      (_, idx) => rangeStart + idx
    )
  );

  // Include ellipsis if there's a gap between the last page of the dynamic range and the first end page
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
