"use client";

import { FindContext } from "@/components/find/find-provider";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { use } from "react";

/**
 * The header search affordance Find morphs out of. While the dialog is
 * engaged, the morph animation imperatively hides this button (the panel
 * visually *is* the button, mid-flight); it reappears when the close
 * animation lands back on it.
 */
export function FindTrigger() {
  const { setOpen, triggerRef } = use(FindContext);
  const t = useTranslations("dashboard");

  return (
    <Button
      ref={triggerRef}
      variant="outline"
      className="text-muted-foreground h-8 w-8 justify-center rounded-md bg-transparent p-0 text-sm font-normal shadow-none xl:relative xl:w-44 xl:justify-start xl:px-3 xl:pr-12 2xl:w-56"
      onClick={() => setOpen(true)}
    >
      <SearchIcon className="size-4 shrink-0 xl:hidden" />
      <span className="sr-only xl:not-sr-only">{t("search")}</span>
      <kbd className="bg-muted pointer-events-none absolute top-1/2 right-1.5 hidden h-5 -translate-y-1/2 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none xl:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
