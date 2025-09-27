"use client";

import { AddScrimCard } from "@/components/dashboard/add-scrim-card";
import { EmptyScrimList } from "@/components/dashboard/empty-scrim-list";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { TeamSwitcherContext } from "@/components/team-switcher-provider";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Logger } from "@/lib/logger";
import type { Scrim } from "@prisma/client";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";
import type { Route } from "next";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { use, useState } from "react";

type Props = {
  scrims: (Scrim & { team: string; creator: string; hasPerms: boolean })[];
};

export function ScrimPagination({ scrims }: Props) {
  const [currPage, setCurrPage] = useState(1);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const t = useTranslations("dashboard");
  const router = useRouter();

  const { teamId } = use(TeamSwitcherContext);

  if (teamId) {
    scrims = scrims.filter((scrim) => scrim.teamId === teamId);
  }

  const pageSize = 15;
  const siblingCount = 1; // Number of pages to show around the current page
  const boundaryCount = 1; // Number of pages to show at the boundaries (start and end)

  // Sort scrims based on the filter
  const sortedScrims = scrims.sort((a, b) => {
    if (filter === "date-asc") {
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    }
    if (filter === "date-desc") {
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    return 0; // No sorting applied
  });

  // Filter and search logic combined
  const filteredAndSearchedScrims = sortedScrims.filter((scrim) => {
    if (search.startsWith("team:")) {
      const teamName = search.slice(5).toLowerCase(); // Extract team name from search query
      return scrim.team.toLowerCase().includes(teamName);
    }
    if (search.startsWith("creator:")) {
      const creatorName = search.slice(8).toLowerCase(); // Extract creator name from search query
      return scrim.creator.toLowerCase().includes(creatorName);
    }
    // General search by scrim name
    return scrim.name.toLowerCase().includes(search.toLowerCase());
  });

  // Pagination logic
  const pages = Math.ceil(filteredAndSearchedScrims.length / pageSize);
  const startIndex = (currPage - 1) * pageSize;
  const currentPageScrims = filteredAndSearchedScrims.slice(
    startIndex,
    startIndex + pageSize
  );

  const pagination = handlePagination({
    currentPage: currPage,
    totalCount: filteredAndSearchedScrims.length,
    siblingCount,
    pageSize,
    boundaryCount,
  });

  if (scrims.length === 0) {
    return <EmptyScrimList />;
  }

  // prefetch the first 5 scrims
  for (const scrim of currentPageScrims.slice(0, 5)) {
    Logger.info("prefetching", `/scrim/${scrim.id}`);
    router.prefetch(`/scrim/${scrim.id}` as Route);
  }

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

        <Input
          type="search"
          placeholder={t("filter.search")}
          className="md:w-[100px] lg:w-[260px]"
          onChange={(e) => {
            setSearch(e.target.value);
          }}
        />
      </span>

      <div className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        {currentPageScrims.map((scrim) => (
          <ScrimCard key={scrim.id} scrim={scrim} />
        ))}

        <AddScrimCard />

        <div className="col-span-full">
          {pages > 1 && (
            <Pagination>
              <PaginationContent>
                {pagination.hasPrevious && (
                  <>
                    <PaginationPrevious
                      className="hidden md:flex"
                      onClick={() => setCurrPage(currPage - 1)}
                      href="#"
                    />
                    <PaginationItem className="md:hidden">
                      <PaginationLink
                        onClick={() => setCurrPage(currPage - 1)}
                        href="#"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </PaginationLink>
                    </PaginationItem>
                  </>
                )}
                {pagination.pages.map((page, index) => {
                  if (page === "...") {
                    // Rendering ellipsis for skipped pages
                    return (
                      <PaginationEllipsis
                        // eslint-disable-next-line react/no-array-index-key
                        key={`ellipsis-${index}`}
                      />
                    );
                  }
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrPage(page)}
                        isActive={currPage === page}
                        href="#"
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
                      onClick={() => setCurrPage(currPage + 1)}
                      href="#"
                    />
                    <PaginationItem className="md:hidden">
                      <PaginationLink
                        onClick={() => setCurrPage(currPage + 1)}
                        href="#"
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
