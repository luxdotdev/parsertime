"use client";

import { ScrimCreationForm } from "@/components/dashboard/scrim-creator";
import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Dialog } from "@radix-ui/react-dialog";
import { Plus } from "lucide-react";
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
        <Button className="motion-safe:ease gap-1.5 shadow-sm active:scale-[0.97] motion-safe:transition-[transform,box-shadow] motion-safe:duration-150 [@media(hover:hover)_and_(pointer:fine)]:hover:scale-[1.02] [@media(hover:hover)_and_(pointer:fine)]:hover:shadow-md">
          <Plus className="motion-safe:ease h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 [@media(hover:hover)_and_(pointer:fine)]:group-hover/button:rotate-90" />
          {t("createScrim")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("createScrim")}</DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ScrimCreationForm setOpen={setOpen} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
