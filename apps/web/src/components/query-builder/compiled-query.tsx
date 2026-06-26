"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tokenizeSql } from "@/lib/query-builder/format";
import { cn } from "@/lib/utils";
import { CheckIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Presentational view of the compiled SQL. Lives inside the output panel's
 * "SQL" tab, so it carries no collapsible chrome of its own; the tab is the
 * disclosure. Renders the source tables, a copy affordance, and the tokenized
 * query, falling back to a hint while the sentence is incomplete.
 */
export function SqlView({
  sql,
  tables,
}: {
  sql: string | null;
  tables: string[];
}) {
  const t = useTranslations("queryBuilderPage");
  const [copied, setCopied] = useState(false);

  const tokens = sql ? tokenizeSql(sql) : [];

  async function copy() {
    if (!sql) return;
    try {
      await navigator.clipboard.writeText(sql);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="border-border bg-muted/40 overflow-hidden rounded-lg border">
      <div className="border-border flex items-center justify-between gap-2 border-b px-3 py-2">
        <span className="text-muted-foreground font-mono text-[0.7rem] tracking-wider uppercase">
          {t("compiledTitle")}
        </span>
        <div className="flex items-center gap-2">
          {tables.length > 0 && (
            <div className="hidden items-center gap-1 sm:flex">
              <span className="text-muted-foreground font-mono text-[0.65rem] tracking-wider uppercase">
                {t("compiledTables")}
              </span>
              {tables.map((table) => (
                <Badge
                  key={table}
                  variant="outline"
                  className="font-mono text-[0.7rem]"
                >
                  {table}
                </Badge>
              ))}
            </div>
          )}
          {sql && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={copy}
              className="h-7 gap-1.5 px-2 text-xs"
            >
              {copied ? (
                <CheckIcon className="size-3.5" aria-hidden="true" />
              ) : (
                <CopyIcon className="size-3.5" aria-hidden="true" />
              )}
              {copied ? t("copied") : t("copy")}
            </Button>
          )}
        </div>
      </div>
      {sql ? (
        <pre className="bg-background/40 m-0 overflow-x-auto px-3 py-3 font-mono text-xs leading-relaxed">
          <code className="text-foreground">
            {tokens.map((tok) => (
              <span
                key={tok.start}
                className={cn(
                  tok.kind === "keyword" && "text-primary font-semibold",
                  tok.kind === "comment" && "text-muted-foreground italic"
                )}
              >
                {tok.text}
              </span>
            ))}
          </code>
        </pre>
      ) : (
        <p className="text-muted-foreground bg-background/40 px-3 py-6 text-xs">
          {t("compiledEmpty")}
        </p>
      )}
    </div>
  );
}
