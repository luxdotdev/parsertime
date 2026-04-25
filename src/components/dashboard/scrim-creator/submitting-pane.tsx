"use client";

import { ReloadIcon } from "@radix-ui/react-icons";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";

export function SubmittingPane() {
  const t = useTranslations("dashboard.scrimCreationForm");
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={prefersReducedMotion ? false : { opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex min-h-0 flex-1 flex-col items-center justify-center px-6 py-12"
    >
      <div className="bg-muted text-muted-foreground flex size-12 items-center justify-center rounded-full">
        <ReloadIcon className="size-5 animate-spin" />
      </div>
      <h2 className="text-foreground mt-5 text-base font-semibold tracking-tight">
        {t("creatingScrim.title")}
      </h2>
      <p className="text-muted-foreground mt-1.5 text-center text-sm">
        {t("creatingScrim.description")}
      </p>
    </motion.div>
  );
}
