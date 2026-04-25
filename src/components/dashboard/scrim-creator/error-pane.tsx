"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  errorCause: string;
  onBack: () => void;
};

export function ErrorPane({ errorCause, onBack }: Props) {
  const t = useTranslations("dashboard.scrimCreationForm");
  const prefersReducedMotion = useReducedMotion();

  const linkClass =
    "text-muted-foreground hover:text-foreground underline-offset-3 hover:underline transition-colors";

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <div className="bg-destructive/15 text-destructive flex size-12 items-center justify-center rounded-full">
          <AlertCircle className="size-5" />
        </div>
        <h2 className="text-foreground mt-5 text-base font-semibold tracking-tight">
          {t("createdScrim.errorTitle")}
        </h2>
        <p className="text-muted-foreground mt-1.5 max-w-md text-sm">
          {t("createdScrim.errorReassurance")}
        </p>
        {errorCause && (
          <pre className="border-border bg-muted/50 text-muted-foreground/90 mt-4 max-w-md overflow-x-auto rounded-md border px-3 py-2 text-left font-mono text-xs whitespace-pre-wrap">
            {errorCause}
          </pre>
        )}
        <p className="text-muted-foreground/80 mt-4 max-w-md text-xs">
          {t("createdScrim.errorEscape")}
        </p>
      </div>
      <div className="border-border/60 bg-background flex flex-col gap-3 border-t px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-muted-foreground/80 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          <span className="text-muted-foreground/70 font-mono text-[0.6875rem] tracking-[0.04em] uppercase">
            {t("createdScrim.errorResourceLabel")}
          </span>
          <a
            href="https://parserti.me/schema"
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            {t("createdScrim.errorResourceSchema")}
          </a>
          <span aria-hidden="true" className="text-muted-foreground/40">
            ·
          </span>
          <a
            href="/debug"
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            {t("createdScrim.errorResourceDebug")}
          </a>
          <span aria-hidden="true" className="text-muted-foreground/40">
            ·
          </span>
          <a
            href="https://parserti.me/discord"
            target="_blank"
            rel="noreferrer"
            className={linkClass}
          >
            {t("createdScrim.errorResourceDiscord")}
          </a>
        </div>
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            {t("createdScrim.errorBack")}
          </Button>
          <Button type="submit">{t("createdScrim.errorRetry")}</Button>
        </div>
      </div>
    </motion.div>
  );
}
