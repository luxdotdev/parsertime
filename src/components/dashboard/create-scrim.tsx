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
import { useState } from "react";

export function CreateScrimButton() {
  const t = useTranslations("dashboard");
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          {/* Create Scrim */}
          {t("addScrim.createScrim")}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {/* Create Scrim */}
            {t("addScrim.createScrim")}
          </DialogTitle>
          <DialogDescription></DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <ScrimCreationForm setOpen={setOpen} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
