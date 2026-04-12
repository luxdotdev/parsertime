"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { toast } from "sonner";

type DeleteMapButtonProps = {
  tournamentMapId: number;
  gameNumber: number;
};

export function DeleteMapButton({
  tournamentMapId,
  gameNumber,
}: DeleteMapButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    startTransition(async () => {
      const res = await fetch(`/api/tournament/map/${tournamentMapId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Map deleted", {
          description: `Map ${gameNumber} has been removed from this match.`,
        });
        router.refresh();
      } else {
        const body = await res.text();
        toast.error("Failed to delete map", {
          description: `${body} (${res.status})`,
        });
      }
    });
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          className="text-muted-foreground hover:text-destructive shrink-0 rounded p-1 transition-colors"
          aria-label={`Delete map ${gameNumber}`}
        >
          <Trash2 className="size-4" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Map {gameNumber}?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently remove this map and its replay data from the
            match. Match scores will be recalculated.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={isPending}>
            {isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
