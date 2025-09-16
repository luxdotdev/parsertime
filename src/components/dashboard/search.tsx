"use client";

import { CommandDialogMenu } from "@/components/command-menu";
import { CommandMenuContext } from "@/components/command-menu-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { User } from "@prisma/client";
import { DialogProps } from "@radix-ui/react-dialog";
import { useTranslations } from "next-intl";
import { use } from "react";

export function Search({ ...props }: DialogProps & { user: User | null }) {
  const { setOpen } = use(CommandMenuContext);
  const t = useTranslations("dashboard");

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "bg-background text-muted-foreground relative h-9 w-full justify-start rounded-[0.5rem] text-sm font-normal shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => setOpen(true)}
        {...props}
      >
        <span className="inline-flex">{t("search")}</span>
        <kbd className="bg-muted pointer-events-none absolute top-[0.45rem] right-[0.3rem] hidden h-5 items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 select-none sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialogMenu user={props.user} />
    </>
  );
}
