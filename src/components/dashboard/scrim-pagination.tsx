"use client";

import { AddScrimCard } from "@/components/dashboard/add-scrim-card";
import { ScrimCard } from "@/components/dashboard/scrim-card";
import { Card } from "@/components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Scrim } from "@prisma/client";
import { useState } from "react";

type Props = {
  scrims: Array<Scrim & { team: string; creator: string; hasPerms: boolean }>;
};

export function ScrimPagination({ scrims }: Props) {
  const [currPage, setCurrPage] = useState(1);

  // Calculate the number of pages
  const pageSize = 15;
  const pages = Math.ceil(scrims.length / pageSize);

  // Get the scrims for the current page
  const startIndex = (currPage - 1) * pageSize;
  const currentPageScrims = scrims.slice(startIndex, startIndex + pageSize);

  return (
    <Card className="">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 p-4">
        {currentPageScrims.map((scrim) => (
          <ScrimCard key={scrim.id} scrim={scrim} />
        ))}

        <AddScrimCard />

        <div className="col-span-full">
          {pages > 1 && (
            <Pagination>
              <PaginationContent>
                {currPage > 1 && (
                  <PaginationPrevious
                    onClick={() => setCurrPage(currPage - 1)}
                    href="#"
                  />
                )}
                {Array.from({ length: pages }, (_, index) => (
                  <PaginationItem key={index}>
                    <PaginationLink
                      onClick={() => setCurrPage(index + 1)}
                      aria-label={`Go to page ${index + 1}`}
                      isActive={currPage === index + 1}
                      href="#"
                    >
                      {index + 1}
                    </PaginationLink>
                  </PaginationItem>
                ))}
                {currPage < pages && (
                  <PaginationNext
                    onClick={() => setCurrPage(currPage + 1)}
                    href="#"
                  />
                )}
              </PaginationContent>
            </Pagination>
          )}
        </div>
      </div>
    </Card>
  );
}
