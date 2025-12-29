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
        <Button>{t("createScrim")}</Button>
      </DialogTrigger>
      <DialogContent>
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
