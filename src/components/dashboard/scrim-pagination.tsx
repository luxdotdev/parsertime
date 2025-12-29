"use client";

import { AddScrimCard } from "@/components/dashboard/add-scrim-card";
import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { ScrimCardSkeleton } from "@/components/dashboard/scrim-card-skeleton";
import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import { Card } from "@/components/ui/card";
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
import { ChevronLeftIcon, ChevronRightIcon, Info, Search } from "lucide-react";
import { useTranslations } from "next-intl";
import { use, useEffect, useState } from "react";
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
  const [cursorStack, setCursorStack] = useState<(string | undefined)[]>([
    undefined,
  ]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch] = useDebounce(search, 300);
  const t = useTranslations("dashboard");

  const { teamId } = use(TeamSwitcherContext);

  const pageSize = 15;

  // Reset cursor stack when search, filter, or team changes
  const effectiveTeamId = isAdmin ? null : teamId;
  useEffect(() => {
    setCursorStack([undefined]);
    setCurrentIndex(0);
  }, [debouncedSearch, filter, effectiveTeamId]);

  const currentCursor = cursorStack[currentIndex];

  // Fetch scrims using React Query
  const { data, isLoading, isError, error } = useQuery<ScrimResponse, Error>({
    queryKey: isAdmin
      ? ["admin-scrims", currentCursor, debouncedSearch, filter]
      : ["scrims", currentCursor, debouncedSearch, filter, teamId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", pageSize.toString());

      if (currentCursor) {
        if (currentCursor === "LAST_PAGE") {
          params.set("lastPage", "true");
        } else if (currentCursor.startsWith("PAGE_")) {
          const pageNum = parseInt(currentCursor.replace("PAGE_", ""));
          params.set("page", pageNum.toString());
        } else {
          params.set("cursor", currentCursor);
        }
      }

      if (isAdmin) {
        params.set("adminMode", "true");
      }

      if (debouncedSearch) {
        params.set("search", debouncedSearch);
      }

      if (filter) {
        params.set("filter", filter);
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
  const totalPages = Math.ceil(totalCount / pageSize);

  // Determine current page based on cursor type
  let currentPage: number;
  if (currentCursor === "LAST_PAGE") {
    currentPage = totalPages;
  } else if (currentCursor?.startsWith("PAGE_")) {
    currentPage = parseInt(currentCursor.replace("PAGE_", ""));
  } else {
    currentPage = currentIndex + 1;
  }

  const siblingCount = 1;
  const boundaryCount = 1;

  const pagination = handlePagination({
    currentPage,
    totalCount,
    siblingCount,
    pageSize,
    boundaryCount,
  });

  function goToNextPage() {
    if (data?.nextCursor) {
      setCursorStack((prev) => {
        const newStack = [...prev.slice(0, currentIndex + 1), data.nextCursor];
        return newStack;
      });
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function goToPreviousPage() {
    if (currentIndex > 0) {
      // If we're on the last page (jumped via LAST_PAGE), go to second-to-last
      if (currentCursor === "LAST_PAGE" && pagination.totalPages > 2) {
        setCursorStack([undefined, `PAGE_${pagination.totalPages - 1}`]);
        setCurrentIndex(1);
      } else {
        setCurrentIndex((prev) => prev - 1);
      }
    }
  }

  function canNavigateToPage(page: number): boolean {
    if (page === currentPage) return true;
    if (page === 1) return true;
    if (page === pagination.totalPages) return true;
    if (page === currentPage - 1 && currentIndex > 0) return true;
    if (page === currentPage + 1 && data?.hasMore) return true;
    return false;
  }

  function navigateToPage(page: number) {
    if (page === 1) {
      setCursorStack([undefined]);
      setCurrentIndex(0);
    } else if (page === pagination.totalPages) {
      setCursorStack([undefined, "LAST_PAGE"]);
      setCurrentIndex(1);
    } else if (page === currentPage - 1) {
      goToPreviousPage();
    } else if (page === currentPage + 1) {
      goToNextPage();
    }
  }

  // Generate skeleton cards array for consistent loading experience
  const skeletonCards = Array.from({ length: pageSize }, (_, index) => (
    <ScrimCardSkeleton key={`skeleton-${index}`} />
  ));

  // Handle error state
  if (isError) {
    return (
      <Card className="bg-background">
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <p className="text-muted-foreground">
              Error loading scrims: {error?.message}
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // Show empty scrim list only if user has no scrims at all
  if (!isLoading && totalScrimsData?.totalCount === 0) {
    return <EmptyScrimList isOnboarding={!seenOnboarding} />;
  }

  const firstFiveScrims = data?.scrims.slice(0, 5) ?? [];

  return (
    <Card className="bg-background">
      <span className="inline-flex gap-2 p-4">
        <Select onValueChange={(v) => setFilter(v)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("filter.title")} />
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              <SelectLabel>{t("filter.select")}</SelectLabel>
              <SelectItem value="date-desc">{t("filter.newToOld")}</SelectItem>
              <SelectItem value="date-asc">{t("filter.oldToNew")}</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>

        <InputGroup className="md:w-[100px] lg:w-[260px]">
          <InputGroupInput
            type="search"
            placeholder={t("filter.search")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupAddon align="inline-end">
            <Tooltip>
              <TooltipTrigger asChild>
                <Info />
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

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {isLoading ? (
          <>
            {/* Show skeleton cards during loading */}
            {skeletonCards}
            <AddScrimCard />
          </>
        ) : data && data.scrims.length > 0 ? (
          <>
            {data.scrims.map((scrim) => (
              <ScrimCard
                key={scrim.id}
                scrim={scrim}
                prefetch={firstFiveScrims.includes(scrim)}
              />
            ))}
            <AddScrimCard />
          </>
        ) : (
          <>
            {/* Show "no results" message when search/filter returns empty but user has scrims */}
            <div className="col-span-full flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground text-lg font-medium">
                {t("filter.noScrimsFound")}
              </p>
              <p className="text-muted-foreground text-sm">
                {t("filter.tryAdjustingFilters")}
              </p>
            </div>
            <AddScrimCard />
          </>
        )}

        <div className="col-span-full">
          {!isLoading && data && pagination.totalPages > 1 && (
            <Pagination>
              <PaginationContent>
                {pagination.hasPrevious && (
                  <>
                    <PaginationPrevious
                      className="hidden md:flex"
                      onClick={goToPreviousPage}
                      href="#"
                    />
                    <PaginationItem className="md:hidden">
                      <PaginationLink onClick={goToPreviousPage} href="#">
                        <ChevronLeftIcon className="h-4 w-4" />
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                {pagination.pages.map((page, index) => {
                  if (page === "...") {
                    return (
                      <PaginationEllipsis
                        // eslint-disable-next-line react/no-array-index-key
                        key={`ellipsis-${index}`}
                      />
                    );
                  }
                  const canNavigate = canNavigateToPage(page);
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={
                          canNavigate ? () => navigateToPage(page) : undefined
                        }
                        isActive={currentPage === page}
                        href="#"
                        className={
                          !canNavigate && currentPage !== page
                            ? "cursor-not-allowed opacity-50"
                            : ""
                        }
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                })}
                {pagination.hasNext && (
                  <>
                    <PaginationNext
                      className="hidden md:flex"
                      onClick={goToNextPage}
                      href="#"
                    />
                    <PaginationItem className="md:hidden">
                      <PaginationLink onClick={goToNextPage} href="#">
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
