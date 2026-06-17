"use client";

import { Button } from "@/components/ui/button";
import { motion, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { useTranslations } from "next-intl";

type Props = {
  hasCorruptedData: boolean;
  onClose: () => void;
  onCreateAnother: () => void;
};

export function SuccessPane({
  hasCorruptedData,
  onClose,
  onCreateAnother,
}: Props) {
  const t = useTranslations("dashboard.scrimCreationForm");
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <motion.div
          initial={prefersReducedMotion ? false : { scale: 0.85 }}
          animate={{ scale: 1 }}
          transition={{
            duration: 0.3,
            ease: [0.16, 1, 0.3, 1],
            delay: 0.05,
          }}
          className="bg-primary/15 text-primary flex size-12 items-center justify-center rounded-full"
        >
          <Check className="size-5" />
        </motion.div>
        <h2 className="text-foreground mt-5 text-base font-semibold tracking-tight">
          {t("createdScrim.title")}
        </h2>
        <p className="text-muted-foreground mt-1.5 text-sm">
          {t("createdScrim.description")}
        </p>
        {hasCorruptedData && (
          <p className="text-muted-foreground/80 mt-3 max-w-sm text-xs">
            {t("dataCorruption.success.description")}
          </p>
        )}
      </div>
      <div className="border-border/60 bg-background flex items-center justify-end gap-2 border-t px-6 py-3">
        <Button type="button" variant="ghost" onClick={onCreateAnother}>
          {t("createdScrim.secondary")}
        </Button>
        <Button type="button" onClick={onClose}>
          {t("createdScrim.primary")}
        </Button>
      </div>
    </motion.div>
  );
}
