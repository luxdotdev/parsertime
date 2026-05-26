"use client";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import type { ChatReport } from "@prisma/client";
import {
  ChevronLeft,
  ChevronRight,
  MessageSquareText,
  Search,
} from "lucide-react";
import type { Route } from "next";
import { useFormatter, useTranslations } from "next-intl";
import NextLink from "next/link";
import { useMemo, useState } from "react";

const PAGE_SIZE = 12;

type ReportWithUser = ChatReport & { user: { name: string | null } };

function formatRelativeDate(
  date: Date,
  format: ReturnType<typeof useFormatter>
): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days < 30) return format.relativeTime(date);
  return format.dateTime(date, {
    month: "short",
    day: "numeric",
    year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function extractPreview(content: string): string {
  // Strip markdown headers, bold, links, etc. for a clean preview
  const stripped = content
    .replace(/^#{1,6}\s+.*/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`~]/g, "")
    .replace(/\n{2,}/g, "\n")
    .trim();

  const firstLine = stripped.split("\n").find((l) => l.trim().length > 20);
  if (!firstLine) return stripped.slice(0, 120);
  return firstLine.trim().slice(0, 120) + (firstLine.length > 120 ? "…" : "");
}

function ReportRow({ report }: { report: ReportWithUser }) {
  const format = useFormatter();
  const preview = useMemo(
    () => extractPreview(report.content),
    [report.content]
  );

  return (
    <NextLink
      href={`/reports/${report.id}` as Route}
      className="group hover:bg-muted/40 focus-visible:ring-ring/50 flex items-start gap-4 px-4 py-3.5 no-underline outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-inset"
    >
      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="text-foreground truncate text-sm font-semibold">
          {report.title}
        </h3>
        <p className="text-muted-foreground line-clamp-1 text-xs">{preview}</p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
        <span
          className="text-muted-foreground font-mono text-xs tabular-nums"
          suppressHydrationWarning
        >
          {formatRelativeDate(report.createdAt, format)}
        </span>
        <ChevronRight
          className="text-muted-foreground -mr-1 size-4 opacity-0 transition-opacity group-hover:opacity-100"
          aria-hidden="true"
        />
      </div>
    </NextLink>
  );
}

export function ReportsList({ reports }: { reports: ReportWithUser[] }) {
  const t = useTranslations("reportsPage.list");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
    );
  }, [reports, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paged = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  return (
    <div className="flex-1 space-y-6 px-6 pt-6 pb-12 md:px-8">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{t("title")}</h1>
        <p className="text-muted-foreground text-sm">{t("description")}</p>
      </div>

      {reports.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search
              className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
              aria-hidden="true"
            />
            <Input
              type="text"
              placeholder={t("searchPlaceholder")}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-8"
            />
          </div>
          <span className="text-muted-foreground shrink-0 font-mono text-xs tabular-nums">
            {t("reportCount", { count: filtered.length })}
          </span>
        </div>
      )}

      {reports.length === 0 ? (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <MessageSquareText />
            </EmptyMedia>
            <EmptyTitle>{t("emptyTitle")}</EmptyTitle>
            <EmptyDescription>{t("emptyDescription")}</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <NextLink href="/chat">{t("startChat")}</NextLink>
            </Button>
          </EmptyContent>
        </Empty>
      ) : filtered.length === 0 ? (
        <div className="text-muted-foreground rounded-lg border border-dashed p-12 text-center text-sm">
          {t("noMatches", { query: search })}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-lg border">
            <div className="divide-border divide-y">
              {paged.map((report) => (
                <ReportRow key={report.id} report={report} />
              ))}
            </div>
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-muted-foreground font-mono text-xs tabular-nums">
                {t("pageStatus", { currentPage, totalPages })}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  aria-label={t("previousPage")}
                >
                  <ChevronLeft className="size-4" />
                  <span className="hidden sm:inline">{t("previous")}</span>
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  aria-label={t("nextPage")}
                >
                  <span className="hidden sm:inline">{t("next")}</span>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
