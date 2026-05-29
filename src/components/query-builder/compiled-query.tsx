"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { tokenizeSql } from "@/lib/query-builder/format";
import { cn } from "@/lib/utils";
import { CheckIcon, ChevronDownIcon, CopyIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export function CompiledQuery({
  sql,
  tables,
}: {
  sql: string | null;
  tables: string[];
}) {
  const t = useTranslations("queryBuilderPage");
  const [open, setOpen] = useState(true);
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
    <section
      aria-label={t("compiledTitle")}
      className="border-border bg-muted/40 rounded-lg border"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 font-mono text-[0.7rem] tracking-wider uppercase transition-colors"
        >
          <ChevronDownIcon
            className={cn(
              "size-3.5 transition-transform",
              !open && "-rotate-90"
            )}
            aria-hidden="true"
          />
          {t("compiledTitle")}
        </button>
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
      {open && (
        <div className="border-border bg-background/40 border-t">
          {sql ? (
            <pre className="m-0 overflow-x-auto rounded-none bg-transparent px-3 py-3 font-mono text-xs leading-relaxed">
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
            <p className="text-muted-foreground px-3 py-4 text-xs">
              {t("compiledEmpty")}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
