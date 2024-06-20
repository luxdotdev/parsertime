"use client";

// @ts-expect-error - error TS2459 in CI
import { DialogProps } from "@radix-ui/react-alert-dialog";
import { CommandDialogMenu } from "@/components/command-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { CommandMenuContext } from "@/components/command-menu-provider";
import { use } from "react";
import { User } from "@prisma/client";

export function Search({ ...props }: DialogProps & { user: User | null }) {
  const { setOpen } = use(CommandMenuContext);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          "relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64"
        )}
        onClick={() => setOpen(true)}
        {...props}
      >
        <span className="inline-flex">Search...</span>
        <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.45rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>
      <CommandDialogMenu user={props.user} />
    </>
  );
}
