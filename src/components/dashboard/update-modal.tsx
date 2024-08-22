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
import { useEffect, useState } from "react";

export function UpdateModal({ data }: { data: UpdateModalData }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasSeenUpdate = localStorage.getItem("hasSeenUpdate");
    if (!hasSeenUpdate) {
      setOpen(true);
    }

    if (hasSeenUpdate && hasSeenUpdate !== data.date) {
      setOpen(true);
    }
  }, [data]);

  function handleClose() {
    localStorage.setItem("hasSeenUpdate", new Date().toDateString());
    setOpen(false);
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="">
        <AlertDialogHeader>
          <AlertDialogTitle>Latest Updates: {data.title}</AlertDialogTitle>
          <AlertDialogDescription className="pb-2 text-muted-foreground">
            {data.date}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogDescription>
          <div dangerouslySetInnerHTML={{ __html: data.content }} />
        </AlertDialogDescription>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <Button type="button" onClick={handleClose}>
              Dismiss
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
