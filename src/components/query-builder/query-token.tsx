"use client";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

export type TokenTech = {
  /** short technical title, e.g. "AVG(eliminations)" */
  title: string;
  /** source tables this token reads from */
  tables: string[];
  /** underlying columns, if relevant */
  columns?: string[];
  /** human note about grain or semantics */
  note?: string;
};

type QueryTokenProps = {
  children: React.ReactNode;
  tech: TokenTech;
  tone?: "content" | "team" | "muted";
  ariaLabel: string;
  removable?: boolean;
  onRemove?: () => void;
  /** editor body; receives a close callback */
  editor?: (close: () => void) => React.ReactNode;
};

export function QueryToken({
  children,
  tech,
  tone = "content",
  ariaLabel,
  removable,
  onRemove,
  editor,
}: QueryTokenProps) {
  const t = useTranslations("queryBuilderPage");
  const [open, setOpen] = useState(false);
  const interactive = Boolean(editor);

  const shellClass = cn(
    "inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-sm leading-6 transition-colors",
    tone === "team" && "font-medium",
    open
      ? "border-primary ring-primary/40 bg-primary/10 text-foreground ring-1"
      : "border-border bg-card text-foreground hover:bg-muted"
  );

  const triggerClass = cn(
    "rounded-[5px] outline-none focus-visible:ring-ring/50 focus-visible:ring-[3px]",
    interactive ? "cursor-pointer" : "cursor-default"
  );

  const removeButton =
    removable && onRemove ? (
      <button
        type="button"
        aria-label={t("removeToken")}
        onClick={onRemove}
        className="text-muted-foreground hover:text-foreground -mr-0.5 rounded-sm opacity-60 transition-opacity hover:opacity-100"
      >
        <XIcon className="size-3" aria-hidden="true" />
      </button>
    ) : null;

  const techContent = (
    <HoverCardContent align="start" className="w-72">
      <TokenTechDetail tech={tech} />
    </HoverCardContent>
  );

  if (!interactive) {
    return (
      <span className={shellClass}>
        <HoverCard openDelay={200} closeDelay={80}>
          <HoverCardTrigger asChild>
            <button
              type="button"
              aria-label={ariaLabel}
              className={triggerClass}
            >
              {children}
            </button>
          </HoverCardTrigger>
          {techContent}
        </HoverCard>
        {removeButton}
      </span>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <span className={shellClass}>
        <HoverCard openDelay={200} closeDelay={80}>
          <HoverCardTrigger asChild>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={ariaLabel}
                aria-haspopup="dialog"
                className={triggerClass}
              >
                {children}
              </button>
            </PopoverTrigger>
          </HoverCardTrigger>
          {techContent}
        </HoverCard>
        {removeButton}
      </span>
      <PopoverContent
        align="start"
        className="w-80 p-0"
        onOpenAutoFocus={(e) => {
          if (!(e.target instanceof HTMLElement)) e.preventDefault();
        }}
      >
        {editor?.(() => setOpen(false))}
      </PopoverContent>
    </Popover>
  );
}

function TokenTechDetail({ tech }: { tech: TokenTech }) {
  const t = useTranslations("queryBuilderPage");
  return (
    <div className="space-y-2.5">
      <p className="text-foreground font-mono text-[0.7rem] tracking-wide">
        {tech.title}
      </p>
      <dl className="space-y-1.5 text-xs">
        <div className="flex gap-2">
          <dt className="text-muted-foreground w-16 shrink-0 font-mono text-[0.65rem] tracking-wider uppercase">
            {t("techTable", { count: tech.tables.length })}
          </dt>
          <dd className="text-foreground font-mono">
            {tech.tables.join(", ")}
          </dd>
        </div>
        {tech.columns && tech.columns.length > 0 && (
          <div className="flex gap-2">
            <dt className="text-muted-foreground w-16 shrink-0 font-mono text-[0.65rem] tracking-wider uppercase">
              {t("techColumn", { count: tech.columns.length })}
            </dt>
            <dd className="text-foreground font-mono">
              {tech.columns.join(", ")}
            </dd>
          </div>
        )}
      </dl>
      {tech.note && (
        <p className="text-muted-foreground border-border border-t pt-2 text-xs leading-relaxed">
          {tech.note}
        </p>
      )}
    </div>
  );
}
