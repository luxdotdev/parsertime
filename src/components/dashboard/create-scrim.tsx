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
        <Button className="group/button gap-1.5">
          <Plus className="h-4 w-4 motion-safe:transition-transform motion-safe:duration-150 motion-safe:ease-out [@media(hover:hover)_and_(pointer:fine)]:group-hover/button:rotate-90" />
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
