"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Link } from "@/components/ui/link";
import { cn } from "@/lib/utils";
import type { ChatReport } from "@prisma/client";
import { CalendarIcon } from "@radix-ui/react-icons";
import { FileText, MessageSquareText, Search } from "lucide-react";
import type { Route } from "next";
import { useMemo, useState } from "react";

type ReportWithUser = ChatReport & { user: { name: string | null } };

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
  return date.toLocaleDateString("en-US", {
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

function ReportCard({ report }: { report: ReportWithUser }) {
  const preview = useMemo(
    () => extractPreview(report.content),
    [report.content]
  );

  return (
    <Link href={`/reports/${report.id}` as Route} className="group block">
      <Card className="[@media(hover:hover)_and_(pointer:fine)]:hover:border-primary/50 relative overflow-hidden border-2 active:scale-[0.97] motion-safe:transition-[transform,box-shadow,border-color] motion-safe:duration-200 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-lg">
        <div className="from-primary/5 absolute inset-0 bg-gradient-to-br via-transparent to-transparent opacity-0 motion-safe:transition-opacity motion-safe:duration-300 [@media(hover:hover)_and_(pointer:fine)]:group-hover:opacity-100" />

        <CardHeader className="relative space-y-2 pb-3">
          <h3 className="[@media(hover:hover)_and_(pointer:fine)]:group-hover:text-primary line-clamp-2 text-lg leading-tight font-bold transition-colors duration-200">
            {report.title}
          </h3>

          <div className="flex flex-col gap-1 text-sm">
            <div className="text-muted-foreground flex items-center gap-2">
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="font-medium" suppressHydrationWarning>
                {formatRelativeDate(report.createdAt)}
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="relative">
          <p className="text-muted-foreground line-clamp-2 text-sm leading-relaxed">
            {preview}
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}

export function ReportsList({ reports }: { reports: ReportWithUser[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return reports;
    const q = search.toLowerCase();
    return reports.filter(
      (r) =>
        r.title.toLowerCase().includes(q) || r.content.toLowerCase().includes(q)
    );
  }, [reports, search]);

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex size-9 items-center justify-center rounded-lg">
            <FileText className="text-primary size-5" />
          </div>
          <div>
            <h2 className="text-2xl leading-none font-bold tracking-tight">
              Reports
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              AI-generated analysis reports from your chat conversations.
            </p>
          </div>
        </div>
      </div>

      {/* Search + count */}
      {reports.length > 0 && (
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reports…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={cn(
                "border-input bg-background placeholder:text-muted-foreground h-9 w-full rounded-md border py-2 pr-3 pl-9 text-sm",
                "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none"
              )}
            />
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {filtered.length} report{filtered.length !== 1 ? "s" : ""}
          </Badge>
        </div>
      )}

      {/* Grid */}
      {reports.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24">
          <div className="bg-muted flex size-14 items-center justify-center rounded-full">
            <MessageSquareText className="text-muted-foreground size-7" />
          </div>
          <h3 className="mt-4 text-sm font-semibold">No reports yet</h3>
          <p className="text-muted-foreground mt-1 max-w-xs text-center text-sm">
            Reports are created from Analyst conversations. Ask the Analyst to
            generate a report and it will appear here.
          </p>
          <Link
            href="/chat"
            className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4 inline-flex h-9 items-center rounded-md px-4 text-sm font-medium no-underline transition-colors"
          >
            Start a chat
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-muted-foreground text-sm">
            No reports match &ldquo;{search}&rdquo;
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}
    </div>
  );
}
