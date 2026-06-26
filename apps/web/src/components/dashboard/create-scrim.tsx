"use client";

import { ScrimCreationForm } from "@/components/dashboard/scrim-creator";
import { Button } from "@/components/ui/button";
import {
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dialog } from "@radix-ui/react-dialog";
import { Plus, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useNextStep } from "nextstepjs";
import { useState } from "react";

export function CreateScrimButton() {
  const [open, setOpen] = useState(false);
  const t = useTranslations("dashboard.addScrim");
  const { currentStep, isNextStepVisible } = useNextStep();

  return (
    <Dialog
      open={open || (currentStep >= 2 && isNextStepVisible)}
      onOpenChange={setOpen}
    >
      <DialogTrigger asChild>
        <Button className="group/button gap-1.5">
          <Plus className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover/button:rotate-90" />
          {t("createScrim")}
        </Button>
      </DialogTrigger>
      <DialogContent
        className="flex max-h-[85svh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        showCloseButton={false}
      >
        <DialogHeader className="border-border/60 flex flex-row items-center justify-between border-b px-6 py-4">
          <DialogTitle className="text-base font-semibold tracking-tight">
            {t("createScrim")}
          </DialogTitle>
          <DialogClose asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground -mr-2"
              aria-label="Close"
            >
              <X className="size-4" />
            </Button>
          </DialogClose>
        </DialogHeader>
        <ScrimCreationForm setOpen={setOpen} />
      </DialogContent>
    </Dialog>
  );
}
