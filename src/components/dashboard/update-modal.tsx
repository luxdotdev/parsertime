"use client";

import { UpdateModalData } from "@/components/dashboard/update-modal-wrapper";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function UpdateModal({ data }: { data: UpdateModalData }) {
  const [open, setOpen] = useState(false);
  const t = useTranslations("updateModal");

  useEffect(() => {
    const hasSeenUpdate = localStorage.getItem("hasSeenUpdate");

    if (!hasSeenUpdate) {
      setOpen(true);
      return;
    }

    const updateDate = new Date(data.date).getTime();
    const seenUpdateDate = new Date(hasSeenUpdate).getTime();
    const now = Date.now();

    if (updateDate > seenUpdateDate && updateDate < now) {
      setOpen(true);
    }
  }, [data]);

  function handleClose() {
    localStorage.setItem("hasSeenUpdate", new Date().toISOString());
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="">
        <AlertDialogHeader>
          <AlertDialogTitle>Latest Updates: {data.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-muted-foreground pb-2">
            {new Date(data.date).toDateString()}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogDescription>
          {/* eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml */}
          <div dangerouslySetInnerHTML={{ __html: data.content }} />
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <Button type="button" onClick={handleClose}>
              {t("dismiss")}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
