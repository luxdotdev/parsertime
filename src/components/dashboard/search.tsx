"use client";

import { CommandMenuContext } from "@/components/command-menu-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { User } from "@prisma/client";
import type { DialogProps } from "@radix-ui/react-dialog";
import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { use } from "react";

export function Search(_: DialogProps & { user: User | null }) {
  const { setOpen } = use(CommandMenuContext);
  const t = useTranslations("dashboard");

  return (
    <Button
      variant="outline"
      className={cn(
        "bg-background text-muted-foreground h-9 w-9 justify-center rounded-[0.5rem] p-0 text-sm font-normal shadow-none xl:relative xl:w-40 xl:justify-start xl:px-3 xl:pr-12 2xl:w-64"
      )}
      onClick={() => setOpen(true)}
    >
      <SearchIcon className="size-4 shrink-0 xl:hidden" />
      <span className="sr-only xl:not-sr-only">{t("search")}</span>
      <kbd className="bg-muted pointer-events-none absolute top-[0.45rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none xl:flex">
        <span className="text-xs">⌘</span>K
      </kbd>
    </Button>
  );
}
