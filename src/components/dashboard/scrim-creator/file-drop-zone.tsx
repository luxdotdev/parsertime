"use client";

import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { cn } from "@/lib/utils";
import type { ParserData } from "@/types/parser";
import { ReloadIcon } from "@radix-ui/react-icons";
import { motion, useReducedMotion } from "framer-motion";
import { Check, Upload } from "lucide-react";
import { useRef, useState, type ChangeEvent, type DragEvent } from "react";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type Props = {
  inputName: string;
  inputId: string;
  invalid: boolean;
  file: File | null;
  parsing: boolean;
  mapData: ParserData | undefined;
  hasCorruption: boolean;
  onFile: (file: File | null) => void;
  description: string;
  dropTitle: string;
  dropSubtitle: string;
  parsedLabel: string;
  parsingLabel: string;
  replaceLabel: string;
  versusLabel: string;
};

export function FileDropZone({
  inputName,
  inputId,
  invalid,
  file,
  parsing,
  mapData,
  hasCorruption,
  onFile,
  description,
  dropTitle,
  dropSubtitle,
  parsedLabel,
  parsingLabel,
  replaceLabel,
  versusLabel,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  function handleInput(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    onFile(f);
  }

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragActive(false);
    const f = e.dataTransfer.files?.[0] ?? null;
    if (f) onFile(f);
  }

  const teamA = mapData?.match_start?.[0]?.[4];
  const teamB = mapData?.match_start?.[0]?.[5];
  const mapName = mapData?.match_start?.[0]?.[2];

  return (
    <Field data-invalid={invalid} id="docs-demo-step6">
      {file && mapData && !parsing ? (
        <motion.div
          key="parsed"
          initial={prefersReducedMotion ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="border-border bg-card/40 relative flex items-start gap-3 rounded-lg border p-4"
        >
          <div className="bg-primary/15 text-primary flex size-9 shrink-0 items-center justify-center rounded-md">
            <Check className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-sm font-medium">
              <span className="truncate">{file.name}</span>
              <span className="text-muted-foreground/70 font-mono text-[0.6875rem] tracking-[0.04em] uppercase tabular-nums">
                {parsedLabel}
              </span>
            </div>
            <div className="text-muted-foreground mt-1 flex items-center gap-2 text-xs">
              <span className="font-mono tabular-nums">
                {formatBytes(file.size)}
              </span>
              {mapName && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{mapName}</span>
                </>
              )}
              {teamA && teamB && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {teamA}{" "}
                    <span className="text-muted-foreground/60 mx-0.5">
                      {versusLabel}
                    </span>{" "}
                    {teamB}
                  </span>
                </>
              )}
            </div>
            {hasCorruption && (
              <p className="text-primary mt-1.5 text-xs">
                Corrupted lines detected. They will be repaired on submit.
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              onFile(null);
              if (inputRef.current) inputRef.current.value = "";
            }}
          >
            {replaceLabel}
          </Button>
          <input
            ref={inputRef}
            type="file"
            id={inputId}
            name={inputName}
            accept=".xlsx,.txt"
            className="sr-only"
            onChange={handleInput}
            aria-invalid={invalid}
          />
        </motion.div>
      ) : (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={handleDrop}
          className={cn(
            "border-border bg-card/30 hover:bg-card/60 group relative flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-6 py-8 text-center transition-colors",
            dragActive && "border-primary/60 bg-primary/5",
            invalid && "border-destructive/60",
            parsing && "pointer-events-none"
          )}
        >
          {parsing ? (
            <>
              <ReloadIcon className="text-muted-foreground size-5 animate-spin" />
              <p className="text-foreground mt-3 text-sm font-medium">
                {parsingLabel}
              </p>
            </>
          ) : (
            <>
              <div className="bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary flex size-10 items-center justify-center rounded-md transition-colors">
                <Upload className="size-5" />
              </div>
              <p className="text-foreground mt-3 text-sm font-medium">
                {dropTitle}
              </p>
              <p className="text-muted-foreground mt-1 text-xs">
                {dropSubtitle}
              </p>
              <p className="text-muted-foreground/70 mt-3 font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
                {description}
              </p>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            id={inputId}
            name={inputName}
            accept=".xlsx,.txt"
            className="sr-only"
            onChange={handleInput}
            aria-invalid={invalid}
          />
        </label>
      )}
    </Field>
  );
}
